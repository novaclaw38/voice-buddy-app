// The "peace of mind camera" check-in protocol — a one-way WebRTC video/audio
// stream from the child's device to the parent's, signaled over a Supabase
// Realtime broadcast channel named 'camera-'+userId.
//
// Child is the WebRTC offerer: it waits for a 'request' from the parent,
// captures its own camera/mic, and offers them. Parent is the answerer: it
// broadcasts 'request', then answers whatever offer comes back.
//
// This module is the only place that touches the signal message shapes —
// ChildPage and ParentPage each call one role-specific function and never
// see a raw payload.type. Extracted after both sides had grown into
// near-identical, independently-maintained ~70-line blocks (see the
// 2026-08-17 architecture review); consolidating surfaced two real
// asymmetries between the two copies, both fixed here:
//   - the child side had no connection-loss detection, so a parent who
//     silently disconnected left the child's camera/mic running forever;
//   - the parent side had no signalingState guard against a duplicate or
//     out-of-order offer, unlike the child's guard on 'answer'.
import { supabase } from '../lib/supabase.js'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const MSG = {
  REQUEST: 'request',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CHILD: 'ice-child',
  ICE_PARENT: 'ice-parent',
  STOP: 'stop',
}

function send(channel, payload) {
  channel.send({ type: 'broadcast', event: 'signal', payload })
}

function isConnectionDead(state) {
  return state === 'failed' || state === 'disconnected' || state === 'closed'
}

// Reentrancy guard: a second start() for the same role+user while one is
// already running returns the existing handle instead of opening a second
// peer connection. Keyed in-module rather than left to each caller, so
// neither page can forget to re-add the guard the other already has.
const active = new Map()

function guarded(key, create) {
  const existing = active.get(key)
  if (existing) return existing
  let closed = false
  const release = () => { active.delete(key) }
  const handle = create(() => {
    if (closed) return
    closed = true
    release()
  })
  active.set(key, handle)
  return handle
}

export function startAsChild(userId, { onStatusChange, onError } = {}) {
  return guarded(`child:${userId}`, (markStopped) => {
    let stream = null
    let pc = null
    const channel = supabase.channel('camera-' + userId, { config: { private: true } })
    const setStatus = (s) => onStatusChange?.(s)

    // Stops the media/peer connection but leaves the channel subscribed —
    // used both when the parent ends a check-in (child stays armed for the
    // next 'request' without ChildPage calling startAsChild again) and as
    // the first step of a full stop().
    const stopMedia = () => {
      stream?.getTracks().forEach((t) => t.stop())
      pc?.close()
      stream = null
      pc = null
    }

    const stop = () => {
      markStopped()
      stopMedia()
      channel.unsubscribe()
    }

    setStatus('idle')

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (payload.type === MSG.REQUEST) {
        if (pc) return // already mid-handshake — ignore a duplicate request
        try {
          setStatus('requesting')
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          setStatus('streaming')

          pc = new RTCPeerConnection(ICE_SERVERS)
          stream.getTracks().forEach((t) => pc.addTrack(t, stream))

          pc.oniceconnectionstatechange = () => {
            if (isConnectionDead(pc.iceConnectionState)) {
              // Stops media and stays armed for the next 'request' — the
              // channel subscription is meant to live for the whole
              // ChildPage session (mount-once), the same as an explicit
              // 'stop' from the parent.
              setStatus('error')
              stopMedia()
            }
          }

          pc.onicecandidate = (e) => {
            if (e.candidate) send(channel, { type: MSG.ICE_CHILD, candidate: e.candidate.toJSON() })
          }

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send(channel, { type: MSG.OFFER, sdp: { type: offer.type, sdp: offer.sdp } })
        } catch (err) {
          setStatus('error')
          onError?.('camera-start-failed')
        }
      }

      if (payload.type === MSG.ANSWER && pc?.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      }

      if (payload.type === MSG.ICE_PARENT && pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch (_) {}
      }

      if (payload.type === MSG.STOP) {
        setStatus('idle')
        stopMedia()
      }
    }).subscribe()

    return { stop }
  })
}

export function startAsParent(userId, { onStatusChange, onRemoteStream, onError } = {}) {
  return guarded(`parent:${userId}`, (markStopped) => {
    const setStatus = (s) => onStatusChange?.(s)

    const pc = new RTCPeerConnection(ICE_SERVERS)
    const channel = supabase.channel('camera-' + userId, { config: { private: true } })

    const stop = () => {
      markStopped()
      send(channel, { type: MSG.STOP })
      pc.close()
      channel.unsubscribe()
    }

    setStatus('requesting')

    pc.ontrack = (e) => {
      onRemoteStream?.(e.streams[0])
      setStatus('streaming')
    }

    pc.oniceconnectionstatechange = () => {
      if (isConnectionDead(pc.iceConnectionState)) {
        setStatus('error')
        onError?.('connection-lost')
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) send(channel, { type: MSG.ICE_PARENT, candidate: e.candidate.toJSON() })
    }

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (payload.type === MSG.OFFER) {
        // Guards against a duplicate/out-of-order offer re-triggering
        // setRemoteDescription mid-negotiation — the child side already
        // had the equivalent guard on 'answer', the parent side didn't.
        if (pc.signalingState !== 'stable') return
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send(channel, { type: MSG.ANSWER, sdp: { type: answer.type, sdp: answer.sdp } })
      }

      if (payload.type === MSG.ICE_CHILD) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch (_) {}
      }
    }).subscribe(() => {
      // Small delay to let the child's subscription settle before it can
      // receive the request. Preserved as-is from the original two
      // implementations — a proper ready-handshake replacing this fixed
      // delay is a separate follow-up, not part of this consolidation.
      setTimeout(() => send(channel, { type: MSG.REQUEST }), 600)
    })

    return { stop }
  })
}
