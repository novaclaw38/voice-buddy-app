import styles from './PrintSheet.module.css'

const RIDDLES = [
  { q: "I have hands but I can't clap. What am I?", a: "A clock" },
  { q: "I'm light as a feather, but even the strongest person can't hold me for more than a few minutes. What am I?", a: "Breath" },
  { q: "What has keys but no locks, space but no room, and you can enter but can't go inside?", a: "A keyboard" },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
  { q: "What gets wetter as it dries?", a: "A towel" },
]

const WORD_GAMES = [
  { prompt: "Name 5 animals that start with the letter S:", lines: 5 },
  { prompt: "Name 5 things you can find in a kitchen:", lines: 5 },
  { prompt: "Name 5 words that rhyme with CAT:", lines: 5 },
  { prompt: "Name 5 fruits:", lines: 5 },
]

export default function PrintSheet({ type, data, childName }) {
  const date = new Date(data?.ts || Date.now()).toLocaleDateString()

  return (
    <div className={styles.sheet}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          {type === 'story' ? '📖 My Story' : type === 'activity' ? '🎨 Fun Activity' : '🎮 Word Games'}
        </h1>
        <div className={styles.meta}>
          <span>Name: {childName || '_____________'}</span>
          <span>Date: {date}</span>
        </div>
      </div>

      {/* Story Sheet */}
      {type === 'story' && (
        <div className={styles.body}>
          <h2 className={styles.subtitle}>Our Story</h2>
          <div className={styles.storyText}>
            <p>{data?.buddyText || 'Once upon a time, in a land full of wonder...'}</p>
          </div>

          <div className={styles.drawBox}>
            <p className={styles.drawLabel}>Draw your favourite part of the story here!</p>
          </div>

          <div className={styles.storyLines}>
            <p className={styles.storyPrompt}>What would you change about the story?</p>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.line} />)}
          </div>
        </div>
      )}

      {/* Activity Sheet */}
      {type === 'activity' && (
        <div className={styles.body}>
          <h2 className={styles.subtitle}>Let's Do Something Fun!</h2>

          <div className={styles.materialsBox}>
            <h3 className={styles.boxTitle}>You might need:</h3>
            <div className={styles.materialsList}>
              {['Paper or cardboard', 'Crayons or markers', 'Scissors (ask a grown-up!)', 'Tape or glue', 'Your imagination!'].map((m, i) => (
                <div key={i} className={styles.checkItem}>
                  <span className={styles.checkbox}>☐</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className={styles.boxTitle} style={{ marginTop: 16 }}>Steps:</h3>
          <div className={styles.activitySteps}>
            <p className={styles.stepText}>{data?.buddyText || 'Follow Buddy\'s instructions step by step!'}</p>
          </div>

          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.stepLine}>
              <span className={styles.stepNum}>{i + 1}</span>
              <div className={styles.line} style={{ flex: 1 }} />
            </div>
          ))}

          <div className={styles.safetyBox}>
            ⚠️ Ask a grown-up before using scissors or glue!
          </div>
        </div>
      )}

      {/* Games Sheet */}
      {type === 'games' && (
        <div className={styles.body}>
          {/* Riddles section */}
          <h2 className={styles.subtitle}>Riddles</h2>
          <p className={styles.gamesHint}>Can you guess the answers? Write them below!</p>
          {RIDDLES.slice(0, 3).map((r, i) => (
            <div key={i} className={styles.riddleCard}>
              <p className={styles.riddleQ}><strong>{i + 1}.</strong> {r.q}</p>
              <div className={styles.riddleAnswer}>
                <span>My answer: </span>
                <div className={styles.line} style={{ flex: 1 }} />
              </div>
            </div>
          ))}

          {/* Word games section */}
          <div style={{ pageBreakBefore: 'always', paddingTop: 20 }}>
            <h2 className={styles.subtitle}>Word Challenges</h2>
            {WORD_GAMES.map((g, i) => (
              <div key={i} className={styles.wordGame}>
                <p className={styles.wordGamePrompt}>{g.prompt}</p>
                {[...Array(g.lines)].map((_, j) => (
                  <div key={j} className={styles.wordLine}>
                    <span className={styles.lineNum}>{j + 1}.</span>
                    <div className={styles.line} style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Answers */}
          <div className={styles.answersBox}>
            <h3>Riddle Answers (fold to hide!)</h3>
            {RIDDLES.slice(0, 3).map((r, i) => (
              <p key={i}>{i + 1}. {r.a}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        Made with ❤️ by Voice Buddy | {childName}'s Learning Fun
      </div>
    </div>
  )
}
