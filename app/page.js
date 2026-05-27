import styles from './page.module.css'

export default function Home() {
  return (
    <>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logo}>🏃</div>
          <h1 className={styles.heading}>Tracker</h1>
          <p className={styles.sub}>Premium Strava analytics. PMC, HR Zones, Aerobic Decoupling and more.</p>
          <a href="/api/strava/connect" className={styles.cta}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
            </svg>
            Connect with Strava
          </a>
          <p className={styles.hint}>Free · No password needed · Auto-syncs your runs</p>
        </div>
      </main>
    </>
  )
}
