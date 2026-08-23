import styles from './TacticalPreview.module.css'

// Static mock of the child's Rank-Up HUD — deliberately NOT a live-rendered
// embed of ChildPage. See "Scope trim" decision in
// docs/superpowers/specs/2026-08-23-promotion-center-design.md.
export default function TacticalPreview({ childName }) {
  return (
    <figure className={styles.frame}>
      <div className={styles.hud}>
        <div className={styles.hudBar}>
          <span className={styles.hudRank}>RECRUIT</span>
          <span className={styles.hudMission}>MISSION 01</span>
        </div>
        <div className={styles.hudBody}>
          <p className={styles.hudText}>"Gear up, Recruit. Mission briefing incoming."</p>
        </div>
      </div>
      <figcaption className={styles.caption}>Live View: What {childName || 'your child'} sees during Rank-Up sessions.</figcaption>
    </figure>
  )
}
