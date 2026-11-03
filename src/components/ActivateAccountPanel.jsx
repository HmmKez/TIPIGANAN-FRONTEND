import { useRef, useState } from 'react'
import { activationApi } from '../api/admin'
import PasswordInput from './PasswordInput'
import ConfirmModal from './ConfirmModal'

/**
 * Activating an account at the library desk (School Records page).
 *
 *   1. Staff enter the person's ID number.
 *   2. The system shows the name the school's list holds for it; staff confirm
 *      it matches the person's school ID card.
 *   3. Staff turn the screen to the person, who types their own email and
 *      password. Staff never need to see or know the password.
 *   4. Done - everything typed is cleared, ready for the next person.
 */
const ROLE_NAME = { student: 'Student', teacher: 'Teacher', staff: 'Staff', super_admin: 'Super Admin' }

const firstError = (e, fallback) => {
  const errs = e?.response?.data?.errors
  return errs ? Object.values(errs).flat()[0] : (e?.response?.data?.message || fallback)
}

export default function ActivateAccountPanel() {
  const [step, setStep] = useState('id')          // id | confirm | details | done
  const [idNumber, setIdNumber] = useState('')
  const [person, setPerson] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [samePerson, setSamePerson] = useState(null)   // when the earlier account's name differs
  const [confirmingDifferent, setConfirmingDifferent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [busy, setBusy] = useState(false)
  const idRef = useRef(null)

  const reset = () => {
    setStep('id'); setIdNumber(''); setPerson(null); setConfirmed(false); setSamePerson(null)
    setEmail(''); setPassword(''); setPassword2('')
    setFieldErrors({}); setError(null); setDone(null)
    setTimeout(() => idRef.current?.focus(), 0)
  }

  const lookUp = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const r = await activationApi.lookup(idNumber)
      setPerson(r.data); setConfirmed(false); setSamePerson(null); setStep('confirm')
    } catch (err) {
      setError(firstError(err, 'Could not look up that ID number.'))
    } finally { setBusy(false) }
  }

  const activate = async (e) => {
    e.preventDefault()
    setFieldErrors({}); setError(null)
    if (password !== password2) { setFieldErrors({ password: ['The two passwords do not match.'] }); return }
    setBusy(true)
    try {
      const r = await activationApi.activate({
        id_number: person.id_number, name_confirmed: true,
        email, password, password_confirmation: password2,
        ...(person.previous_name ? { same_person: samePerson } : {}),
      })
      // Nothing the person typed stays on screen.
      setEmail(''); setPassword(''); setPassword2('')
      setDone(r.data.message); setStep('done')
    } catch (err) {
      const errs = err?.response?.data?.errors
      if (errs && (errs.email || errs.password)) setFieldErrors(errs)
      else setError(firstError(err, 'The account could not be activated.'))
      setPassword(''); setPassword2('')
    } finally { setBusy(false) }
  }

  const finalRole = person && (samePerson === false ? person.role_if_new : person.role)

  return (
    <div className="panel activate-panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <div className="panel-title"><i className="fas fa-user-check" style={{ marginRight: 8 }}></i>Activate an Account</div>
        {step !== 'id' && step !== 'done' && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Start over</button>
        )}
      </div>
      <div className="panel-body">
        <ol className="activate-steps" aria-label="Steps">
          {['ID number', 'Confirm the name', 'They set their password'].map((label, i) => {
            const at = { id: 0, confirm: 1, details: 2, done: 3 }[step]
            return <li key={label} className={at > i ? 'done' : at === i ? 'current' : ''}>{label}</li>
          })}
        </ol>

        {error && <div className="notice-banner warning" style={{ marginBottom: 14 }}><i className="fas fa-exclamation-triangle"></i><span>{error}</span></div>}

        {step === 'id' && (
          <form onSubmit={lookUp} className="activate-id">
            <p className="text-muted" style={{ marginTop: 0 }}>
              For a student or teacher at the desk with their school ID card. Only ID numbers on the school's list can be activated.
            </p>
            <div className="form-group" style={{ maxWidth: 260 }}>
              <label className="form-label" htmlFor="activate-id">ID Number <span className="req">*</span></label>
              <input id="activate-id" ref={idRef} type="text" className="form-control" inputMode="numeric" maxLength={5}
                     pattern="\d{5}" placeholder="e.g. 10001" autoComplete="off" value={idNumber}
                     onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={busy || idNumber.length !== 5}>
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-search'}`}></i> Look up
            </button>
          </form>
        )}

        {step === 'confirm' && person && (
          <div>
            <div className="activate-person">
              <div className="activate-person-label">Name on the school's list for <code>{person.id_number}</code></div>
              <div className="activate-person-name">{person.full_name}</div>
              <div className="text-muted">
                Will be activated as a <b>{ROLE_NAME[finalRole] || finalRole}</b>
                {person.list_role !== finalRole && !['staff', 'super_admin'].includes(finalRole) && (
                  <> — the list says {ROLE_NAME[person.list_role]}; give that role in User Management afterwards</>
                )}
              </div>
              {person.previous_name && (
                <div className="notice-banner warning" style={{ marginTop: 12, alignItems: 'flex-start' }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>
                    <b>This ID number's earlier account has a different name: {person.previous_name}.</b> Is this the same person?
                    <label className="activate-check" style={{ marginTop: 8 }}>
                      <input type="radio" name="same-person" checked={samePerson === true} onChange={() => setSamePerson(true)} />
                      Same person, the name was corrected. They keep their bookmarks and history.
                    </label>
                    <label className="activate-check" style={{ marginTop: 6 }}>
                      <input type="radio" name="same-person" checked={samePerson === false} onChange={() => setSamePerson(false)} />
                      Different person. They start with a new account, and the old one stays closed.
                    </label>
                  </span>
                </div>
              )}
              {person.earlier_account && !person.previous_name && (
                <div className="notice-banner" style={{ marginTop: 12 }}>
                  <i className="fas fa-info-circle"></i>
                  <span>This ID number has an earlier account. Activating it keeps their bookmarks and history and sets a new email and password.</span>
                </div>
              )}
            </div>
            <label className="activate-check">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              I've checked their school ID card, and this name matches the person in front of me.
            </label>
            <button type="button" className="btn btn-primary" style={{ width: 'auto', marginTop: 14 }} disabled={!confirmed || (person.previous_name && samePerson === null)}
                    onClick={() => {
                      // Cannot be undone on screen, so it gets a second look.
                      if (samePerson === false) { setConfirmingDifferent(true); return }
                      setStep('details'); setError(null)
                    }}>
              <i className="fas fa-arrow-right"></i> Continue
            </button>
            <ConfirmModal
              open={confirmingDifferent}
              icon="fa-user-plus"
              confirmStyle="warning"
              title={`Start a new account for ${person.full_name}?`}
              message={`${person.previous_name}'s account will be closed for good, and its bookmarks and history stay with it. They cannot be moved to the new account from this screen. Choose this only if the ID number now belongs to someone else.`}
              confirmLabel="Yes, different person"
              onCancel={() => setConfirmingDifferent(false)}
              onConfirm={() => { setConfirmingDifferent(false); setStep('details'); setError(null) }}
            />
          </div>
        )}

        {step === 'details' && person && (
          <form onSubmit={activate} autoComplete="off">
            <div className="notice-banner" style={{ marginBottom: 16 }}>
              <i className="fas fa-desktop"></i>
              <span><b>Turn the screen to {person.first_name}.</b> They type their own email and password — you don't need to see it.</span>
            </div>
            <div className="activate-fields">
              <div className="form-group">
                <label className="form-label" htmlFor="activate-email">Email Address <span className="req">*</span></label>
                <input id="activate-email" type="email" className="form-control" autoComplete="off" value={email}
                       onChange={e => setEmail(e.target.value)} required autoFocus />
                {fieldErrors.email && <small className="field-error">{fieldErrors.email[0]}</small>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="activate-pw">Password <span className="req">*</span></label>
                <PasswordInput id="activate-pw" autoComplete="new-password" minLength={8} value={password}
                               onChange={e => setPassword(e.target.value)} required />
                <small className="text-muted" style={{ fontSize: 11 }}>At least 8 characters, with an uppercase letter, a lowercase letter, and a number.</small>
                {fieldErrors.password && <small className="field-error">{fieldErrors.password[0]}</small>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="activate-pw2">Confirm Password <span className="req">*</span></label>
                <PasswordInput id="activate-pw2" autoComplete="new-password" minLength={8} value={password2}
                               onChange={e => setPassword2(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={busy}>
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-user-check'}`}></i> Activate account
            </button>
          </form>
        )}

        {step === 'done' && (
          <div>
            <div className="notice-banner success" role="status" style={{ marginBottom: 14 }}>
              <i className="fas fa-check-circle"></i><span>{done}</span>
            </div>
            <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={reset}>
              <i className="fas fa-user-plus"></i> Activate another account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
