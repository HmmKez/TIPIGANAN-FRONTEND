import { useState } from 'react'

// A password box with an eye button on the right that shows or hides what was
// typed. Takes the same props as a normal <input>.
export default function PasswordInput({ className = 'form-control', ...props }) {
  const [shown, setShown] = useState(false)

  return (
    <div className="password-field">
      <input {...props} type={shown ? 'text' : 'password'} className={className} />
      <button type="button" className="password-toggle"
              onClick={() => setShown(s => !s)}
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
              title={shown ? 'Hide password' : 'Show password'}>
        <i className={`fas ${shown ? 'fa-eye-slash' : 'fa-eye'}`}></i>
      </button>
    </div>
  )
}
