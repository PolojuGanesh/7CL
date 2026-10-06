import { useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function numberField(formData, name) {
  return Number(formData.get(name))
}

async function addPlayer(player) {
  const response = await fetch(`${API_BASE_URL}/api/admin/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(player),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'The player could not be added.')
  }
  if (!result?.player?.name) {
    throw new Error('The server response did not include the saved player.')
  }

  return result.player
}

function App() {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setSaving(true)
    setFeedback(null)

    try {
      const player = await addPlayer({
        name: data.get('name'),
        initials: data.get('initials'),
        role: data.get('role'),
        country: data.get('country'),
        basePriceLakhs: numberField(data, 'basePriceLakhs'),
        stats: {
          matches: numberField(data, 'matches'),
          runs: numberField(data, 'runs'),
          wickets: numberField(data, 'wickets'),
          average: numberField(data, 'average'),
          strikeRate: numberField(data, 'strikeRate'),
        },
        active: data.get('active') === 'on',
      })
      form.reset()
      setFeedback({ type: 'success', text: `${player.name} was added to the player catalogue.` })
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error
          ? error.message
          : 'Could not connect to the API. Check that the backend server is running.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a className="brand" href="/" aria-label="7CL admin home">
          <span className="brand-mark">7CL</span>
          <span className="brand-divider" />
          <span className="brand-caption">PLAYER ADMIN</span>
        </a>
        <span className="header-status"><span /> DATABASE ENTRY</span>
      </header>

      <main className="admin-main">
        <div className="admin-intro">
          <span className="admin-eyebrow">PLAYER CATALOGUE <span>·</span> MANAGEMENT</span>
          <h1>Add a <span>player</span></h1>
          <p>Enter the complete player profile and auction details. Every field is required.</p>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <section className="admin-form-section">
            <div className="admin-section-heading">
              <span className="admin-section-number">01</span>
              <div><h2>Player profile</h2><p>Identity and playing role</p></div>
            </div>
            <div className="admin-field-grid">
              <label className="admin-field admin-field-wide">
                <span>Full name</span>
                <input name="name" type="text" autoComplete="off" minLength={2} maxLength={80} placeholder="e.g. Arjun Patel" required />
              </label>
              <label className="admin-field">
                <span>Initials <small>1–4 letters</small></span>
                <input name="initials" type="text" autoComplete="off" maxLength={4} pattern="[A-Za-z]{1,4}" placeholder="e.g. AP" required />
              </label>
              <label className="admin-field">
                <span>Country code <small>2–3 letters</small></span>
                <input name="country" type="text" autoComplete="off" minLength={2} maxLength={3} pattern="[A-Za-z]{2,3}" placeholder="e.g. IND" required />
              </label>
              <label className="admin-field">
                <span>Playing role</span>
                <select name="role" defaultValue="" required>
                  <option value="" disabled>Select role</option>
                  <option>Batter</option>
                  <option>Bowler</option>
                  <option>All-rounder</option>
                  <option>Wicket-keeper</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Base price <small>in lakhs</small></span>
                <input name="basePriceLakhs" type="number" min="1" step="any" placeholder="e.g. 25" required />
              </label>
            </div>
          </section>

          <section className="admin-form-section">
            <div className="admin-section-heading">
              <span className="admin-section-number">02</span>
              <div><h2>Career statistics</h2><p>Use 0 when a statistic is not applicable</p></div>
            </div>
            <div className="admin-field-grid admin-stats-grid">
              <label className="admin-field">
                <span>Matches</span>
                <input name="matches" type="number" min="0" step="1" placeholder="0" required />
              </label>
              <label className="admin-field">
                <span>Runs</span>
                <input name="runs" type="number" min="0" step="1" placeholder="0" required />
              </label>
              <label className="admin-field">
                <span>Wickets</span>
                <input name="wickets" type="number" min="0" step="1" placeholder="0" required />
              </label>
              <label className="admin-field">
                <span>Batting average</span>
                <input name="average" type="number" min="0" step="any" placeholder="0" required />
              </label>
              <label className="admin-field">
                <span>Strike rate</span>
                <input name="strikeRate" type="number" min="0" step="any" placeholder="0" required />
              </label>
            </div>
          </section>

          <div className="admin-form-footer">
            <label className="admin-active-toggle">
              <input name="active" type="checkbox" defaultChecked />
              <span><strong>Active in player pool</strong><small>Available for upcoming auctions</small></span>
            </label>
            <button className="admin-submit" type="submit" disabled={saving}>
              {saving ? 'Adding player…' : 'Add player to catalogue'}
            </button>
          </div>
          {feedback && (
            <p className={`admin-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.text}
            </p>
          )}
        </form>

        <p className="admin-footnote">Player records are validated and saved to the 7CL database.</p>
      </main>
    </div>
  )
}

export default App
