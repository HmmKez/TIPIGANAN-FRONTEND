// What to show where a person's name goes.
//
// Names are no longer collected at registration — an account is identified by
// the school's 5-digit ID number, and the school's API supplies the real name
// later. So `user.name` is null for any account created since that change, and
// anything printing it directly would render "null", "undefined", or nothing
// at all.
//
// The backend appends `display_name` to every serialised user (name, falling
// back to the ID number). The extra fallbacks here cover a user object that was
// cached in localStorage before this change shipped, so someone who was already
// signed in doesn't see a blank name until their next login.
export function userLabel(user, fallback = 'User') {
  if (!user) return fallback
  return user.display_name || user.name || user.id_number || fallback
}

// First word only, for greetings ("Welcome back, Juan"). An account with no
// name yet yields its ID number, which reads fine in the same slot.
export function firstNameOf(user, fallback = 'there') {
  const label = userLabel(user, '')
  return label ? String(label).split(/\s+/)[0] : fallback
}
