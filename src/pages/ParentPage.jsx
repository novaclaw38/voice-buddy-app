import { useState, useEffect, Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSettings, saveSettings, migratePinIfNeeded } from '../utils/storage.js'
import { useSubscription } from '../hooks/useSubscription.jsx'
import { supabase } from '../lib/supabase.js'
import ChildrenManager from '../components/ChildrenManager.jsx'
import SkipLink from '../components/SkipLink.jsx'
import UpgradePrompt from '../components/UpgradePrompt.jsx'
import SettingsTab from '../components/parentTabs/SettingsTab.jsx'
import SubscriptionTab from '../components/parentTabs/SubscriptionTab.jsx'
import AccountTab from '../components/parentTabs/AccountTab.jsx'
import LearningTab from '../components/parentTabs/LearningTab.jsx'
import MessagesTab from '../components/parentTabs/MessagesTab.jsx'
import CameraTab from '../components/parentTabs/CameraTab.jsx'
import HistoryTab from '../components/parentTabs/HistoryTab.jsx'
import PrintTab from '../components/parentTabs/PrintTab.jsx'
import styles from './ParentPage.module.css'
import shared from '../components/parentTabs/shared.module.css'
import { IconArrowLeft } from '../components/icons.jsx'

// Grouped so the tab bar reads as clusters of related settings rather than
// eight flat, same-weight buttons in a row.
const TAB_GROUPS = [
  { label: 'Child',    tabs: ['Children', 'Settings'] },
  { label: 'Learning', tabs: ['Learning'] },
  { label: 'Connect',  tabs: ['Messages', 'Camera', 'History', 'Print'] },
  { label: 'Billing',  tabs: ['Subscription', 'Account'] },
]
const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs)

// ParentPage is the shell: it owns only what's genuinely shared across 2+
// tabs — settings (Settings writes it, Learning/Print read childName),
// isPro/tier/daysLeft (the trial banner plus Settings/Messages/Camera's
// paywall gates), upgradeTrigger/UpgradePrompt (rendered once, triggered
// from three different tabs), and printData/printType (History writes it,
// Print reads it). Everything else lives in its own tab component under
// src/components/parentTabs/, each mounting only while its tab is active —
// nine flat, same-scope tabs sharing one ~25-useState bag became nine
// independently testable modules (2026-08-17 architecture review,
// Candidate C).
export default function ParentPage({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState('Settings')
  const [settings, setSettings] = useState(() => getSettings())
  const { isPro, tier, daysLeft } = useSubscription()
  // Which feature triggered the upgrade prompt, so its copy can be
  // contextual (see UpgradePrompt's TRIGGERS map) instead of one generic
  // pitch reused everywhere. null = closed.
  const [upgradeTrigger, setUpgradeTrigger] = useState(null)
  // Written by HistoryTab's "Print this" button, read by PrintTab — a real
  // cross-tab dependency, so it stays here rather than local to either.
  const [printData, setPrintData] = useState(null)
  const [printType, setPrintType] = useState('story')

  // ChildPage redirects here with this when a child hits the free daily
  // chat limit and a grown-up enters the PIN to unlock more.
  useEffect(() => {
    if (location.state?.openUpgrade) setUpgradeTrigger(location.state.openUpgrade)
  }, [location.state])

  // One-time migration of any pre-existing plaintext parentPin to a hash.
  useEffect(() => {
    migratePinIfNeeded(getSettings()).then(setSettings)
  }, [])

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleSelectPrint = (entry) => {
    setPrintData(entry)
    // A stale "Games" selection from an earlier visit would otherwise
    // silently ignore this entry — Games is a generic worksheet that
    // never reads printData, so force the type back to one that does.
    setPrintType('story')
    setTab('Print')
  }

  return (
    <>
      <SkipLink />
      <main className={styles.page} id="main">
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <IconArrowLeft size={16} /> Back to Buddy
        </button>
        <h1 className={styles.title}>Parent Dashboard</h1>
        <button className={shared.btnDanger} style={{ flexShrink: 0 }} onClick={handleLogout}>
          Log out
        </button>
      </div>

      {/* Trial status banner */}
      {tier === 'trial' && daysLeft !== null && daysLeft <= 3 && (
        <div className={styles.trialBanner}>
          <span>Your free trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.</span>
          <button className={styles.trialBannerBtn} onClick={() => setUpgradeTrigger('trialEnding')}>Add payment method</button>
        </div>
      )}
      {tier === 'free' && daysLeft === 0 && (
        <div className={`${styles.trialBanner} ${styles.trialBannerEnded}`}>
          <span>Your free trial has ended.</span>
          <button className={styles.trialBannerBtn} onClick={() => setUpgradeTrigger('trialEnded')}>Subscribe to Buddy Pro</button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabsScroller}>
        <div
          className={styles.tabs}
          role="tablist"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            const i = ALL_TABS.indexOf(tab)
            const next = e.key === 'ArrowRight' ? (i + 1) % ALL_TABS.length : (i - 1 + ALL_TABS.length) % ALL_TABS.length
            setTab(ALL_TABS[next])
            e.currentTarget.querySelector(`#tab-${ALL_TABS[next]}`)?.focus()
          }}
        >
          {TAB_GROUPS.map((group, gi) => (
            <Fragment key={group.label}>
              <div className={styles.tabGroup}>
                <span className={styles.tabGroupLabel} aria-hidden="true">{group.label}</span>
                <div className={styles.tabGroupButtons} role="group" aria-label={group.label}>
                  {group.tabs.map((t) => (
                    <button
                      key={t}
                      id={`tab-${t}`}
                      className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
                      onClick={() => setTab(t)}
                      role="tab"
                      aria-selected={tab === t}
                      aria-controls={`tabpanel-${t}`}
                      tabIndex={tab === t ? 0 : -1}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {gi < TAB_GROUPS.length - 1 && <span className={styles.tabDivider} aria-hidden="true" />}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Tab content — each tab mounts only while active */}
      <div className={styles.content} role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1}>
        {tab === 'Children' && (
          <ChildrenManager
            session={session}
            onSwitched={() => { setSettings(getSettings()); navigate('/app') }}
          />
        )}
        {tab === 'Settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSetting={updateSetting}
            isPro={isPro}
            onUpgrade={setUpgradeTrigger}
            session={session}
          />
        )}
        {tab === 'Subscription' && <SubscriptionTab />}
        {tab === 'Account' && <AccountTab session={session} />}
        {tab === 'Learning' && <LearningTab childName={settings.childName} />}
        {tab === 'Messages' && <MessagesTab isPro={isPro} onUpgrade={setUpgradeTrigger} />}
        {tab === 'Camera' && <CameraTab isPro={isPro} onUpgrade={setUpgradeTrigger} />}
        {tab === 'History' && <HistoryTab onSelectPrint={handleSelectPrint} />}
        {tab === 'Print' && (
          <PrintTab
            printData={printData}
            printType={printType}
            onSelectType={setPrintType}
            onSetSample={setPrintData}
            childName={settings.childName}
          />
        )}
      </div>

      {upgradeTrigger && (
        <UpgradePrompt session={session} trigger={upgradeTrigger} onClose={() => setUpgradeTrigger(null)} />
      )}
    </main>
    </>
  )
}
