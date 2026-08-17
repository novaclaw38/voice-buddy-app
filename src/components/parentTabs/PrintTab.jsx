import PrintSheet from '../PrintSheet.jsx'
import { IconBook, IconPalette, IconPrinter } from '../icons.jsx'
import shared from './shared.module.css'
import styles from './PrintTab.module.css'

// printData/printType are shell-owned, not local — History's "Print this"
// button writes them and switches to this tab, so both tabs need the same
// state (same shape as ChildPage's showActivity/dailyActivity, Candidate B).
export default function PrintTab({ printData, printType, onSelectType, onSetSample, childName }) {
  const canPrintNow = printType === 'games' || !!printData

  const handlePrint = () => {
    if (!canPrintNow) return
    window.print()
  }

  return (
    <div className={shared.section}>
      <h2 className={shared.sectionTitle}>Print</h2>

      <div className={shared.field}>
        <label className={shared.label}>Print Type</label>
        <div className={styles.printTypes}>
          {['story','activity','games'].map((t) => (
            <button
              key={t}
              className={`${styles.printTypeBtn} ${printType === t ? styles.activePrintType : ''}`}
              onClick={() => onSelectType(t)}
            >
              {t === 'story' ? <><IconBook size={15} /> Story</> : t === 'activity' ? <><IconPalette size={15} /> Activity</> : <>Games</>}
            </button>
          ))}
        </div>
      </div>

      {printData && (
        <div className={shared.field}>
          <label className={shared.label}>Selected content</label>
          <div className={styles.printPreviewMeta}>
            <span className={`${shared.modeBadge} ${shared[printData.mode]}`}>{printData.mode}</span>
            <span>{printData.userText?.slice(0, 60)}...</span>
          </div>
        </div>
      )}

      <div className={shared.btnRow}>
        <button
          className={styles.btnPrint}
          onClick={handlePrint}
          disabled={!canPrintNow}
        >
          <IconPrinter size={16} /> Print Now
        </button>
        {printType !== 'games' && (
          <button
            className={shared.btnSave}
            onClick={() => onSetSample({
              mode: printType,
              userText: 'Sample content',
              buddyText: `Here is a fun ${printType} for ${childName}! Enjoy it together.`,
              ts: Date.now(),
            })}
          >
            Use Sample
          </button>
        )}
      </div>

      {!canPrintNow && (
        <p className={shared.hint} style={{ marginTop: 12 }}>
          Select an item from History to print, or tap "Use Sample" to try a blank template.
        </p>
      )}
      {printType === 'games' && (
        <p className={shared.hint} style={{ marginTop: 12 }}>
          Riddles and word games are a generic worksheet — they aren't tied to a specific conversation.
        </p>
      )}

      {/* Hidden print area — shown only during window.print() */}
      {canPrintNow && (
        <div id="print-portal" className={styles.printPortal}>
          <PrintSheet
            type={printType}
            data={printData}
            childName={childName}
          />
        </div>
      )}
    </div>
  )
}
