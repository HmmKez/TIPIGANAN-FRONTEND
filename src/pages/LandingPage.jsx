import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MDC_LOGO } from '../config/branding'
import { useAuth } from '../contexts/AuthContext'
import { landingApi, categoriesApi } from '../api'
import { apiOrigin } from '../api/axios'

const landingStyles = `
  .landing-body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background:#F6F7FB; color:#2C3142; line-height:1.5; }
  .landing-wrapper { min-height:100vh; display:flex; flex-direction:column; }
  .lp-navbar {
    background: rgba(255,255,255,0.98); backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E8F0; padding: 0 48px; height: 80px;
    display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; z-index:1000;
  }
  .lp-logo-area { display:flex; align-items:center; gap:16px; }
  /* Inset ~11.5% so the landscape badge fits wholly inside the round plate
     rather than being clipped by it — see .sidebar-mdc-logo in styles.css. */
  .lp-logo-img { width:56px; height:56px; object-fit:contain; border-radius:50%;
    background: linear-gradient(135deg, #EBF0FF, #ffffff); padding:6px;
    box-shadow: 0 4px 12px rgba(52,95,207,.15); }
  .lp-divider { width:1px; height:36px; background: linear-gradient(180deg, transparent, #E5E8F0, transparent); }
  .lp-brand-main {
    font-weight:800; font-size:20px;
    background: linear-gradient(135deg, #345FCF, #2A4FB5);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    letter-spacing:-.5px;
  }
  .lp-brand-sub { font-size:9px; font-weight:600; color:#8A8A8A; letter-spacing:1.2px; text-transform:uppercase; }
  .lp-nav-links { display:flex; gap:36px; align-items:center; }
  .lp-nav-links a { font-size:14px; font-weight:500; color:#4A4A4A; text-decoration:none; transition: color .2s; }
  .lp-nav-links a:hover { color:#345FCF; }
  .lp-nav-actions { display:flex; gap:12px; align-items:center; }
  .lp-btn-outline {
    border: 1.5px solid #E5E8F0; padding: 9px 24px; border-radius: 48px; background: transparent;
    font-weight:600; font-size:13px; color:#2C3142; cursor:pointer; text-decoration:none;
    display:inline-flex; align-items:center; gap:8px; transition: all .3s;
  }
  .lp-btn-outline:hover { border-color:#345FCF; background:#EBF0FF; color:#2A4FB5; }
  .lp-btn-primary {
    background: linear-gradient(135deg, #345FCF, #2A4FB5); color:#fff; padding:9px 28px;
    border-radius:48px; font-weight:600; font-size:13px; border:none; text-decoration:none;
    display:inline-flex; align-items:center; gap:8px; cursor:pointer;
    box-shadow: 0 4px 12px rgba(52,95,207,.3); transition: all .3s;
  }
  .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(52,95,207,.4); }
  /* background-image is set inline from the API (a Super Admin can swap it),
     so only the framing lives here. The brand colour underneath means a hero
     that is narrower than the viewport never shows bare white. */
  .lp-hero {
    background-color: #2A4FB5;
    background-size: cover; background-position: center; background-repeat: no-repeat;
    color: white; padding: 120px 48px 130px; position:relative;
  }
  /* Super-Admin-only control, pinned to the hero's corner. */
  .lp-hero-edit {
    position:absolute; right:20px; bottom:20px; z-index:3;
    display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end;
  }
  .lp-hero-edit button {
    display:inline-flex; align-items:center; gap:7px; cursor:pointer;
    background: rgba(0,0,0,.55); color:#fff; border:1px solid rgba(255,255,255,.35);
    padding:8px 14px; border-radius:24px; font-size:12px; font-weight:600;
    font-family:inherit; backdrop-filter: blur(8px); transition: all .2s;
  }
  .lp-hero-edit button:hover:not(:disabled) { background: rgba(0,0,0,.75); border-color:#fff; }
  .lp-hero-edit button:disabled { opacity:.6; cursor:default; }
  .lp-hero-err {
    background: rgba(192,57,43,.92); color:#fff; padding:7px 12px;
    border-radius:16px; font-size:12px; font-weight:600;
  }
  .lp-hero-container { max-width:1280px; margin:0 auto; position:relative; z-index:2; }
  .lp-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.14);
    border:1px solid rgba(255,255,255,.22); padding:6px 14px; border-radius:22px; font-size:12px;
    font-weight:600; letter-spacing:.5px; margin-bottom:20px; backdrop-filter: blur(10px); }
  .lp-hero h1 { font-size:52px; font-weight:800; line-height:1.15; margin-bottom:16px; letter-spacing:-1px; }
  .lp-hero h1 span { background: linear-gradient(135deg, #6B8AF0, #B388FF); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lp-hero p { font-size:17px; line-height:1.7; max-width:640px; opacity:.94; margin-bottom:32px; }
  .lp-hero-actions { display:flex; gap:14px; flex-wrap:wrap; }
  .lp-hero-cta { background:#fff; color:#345FCF; padding: 14px 32px; border-radius:48px; font-weight:700;
    font-size:14px; text-decoration:none; display:inline-flex; align-items:center; gap:10px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2); transition: all .3s;
  }
  .lp-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.28); }
  .lp-hero-secondary { border: 1.5px solid rgba(255,255,255,.5); padding: 14px 32px; border-radius:48px;
    color:#fff; font-weight:600; font-size:14px; text-decoration:none; background: rgba(255,255,255,.08);
    backdrop-filter: blur(10px); transition: all .3s; display:inline-flex; align-items:center; gap:10px;
  }
  .lp-hero-secondary:hover { background: rgba(255,255,255,.16); border-color: #fff; }

  .lp-section { padding: 80px 48px; }
  .lp-section h2 { font-size:36px; font-weight:800; text-align:center; margin-bottom:12px; letter-spacing:-.5px; }
  .lp-section .subtitle { font-size:15px; color:#8A8A8A; text-align:center; max-width:600px; margin: 0 auto 48px; }
  .lp-container { max-width:1280px; margin:0 auto; }
  .lp-stat-strip {
    background: linear-gradient(135deg, #345FCF, #2A4FB5); color:#fff; padding: 40px 48px;
    display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 30px; text-align:center;
  }
  .lp-stat-strip .value { font-size:36px; font-weight:800; margin-bottom:4px; }
  .lp-stat-strip .label { font-size:12px; opacity:.9; text-transform:uppercase; letter-spacing:1px; font-weight:600; }
  /* Six cards on a FIXED three-column grid, so they always land 3 + 3.
     auto-fit was packing as many 260px columns as the viewport allowed — five
     on a wide screen — leaving a ragged 4 + 2 (or 5 + 1) final row. A fixed
     column count is what makes the rows uniform at every width; the breakpoints
     below step it down to 2 and then 1, which still divide six evenly. */
  .lp-features-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:24px; }
  @media (max-width: 1024px) { .lp-features-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .lp-features-grid { grid-template-columns: 1fr; } }
  .lp-feature-card {
    background:#fff; border:1px solid #E5E8F0; border-radius:16px; padding:32px 24px;
    text-align:center; transition: all .3s;
    /* Equal-height cards regardless of how long the copy runs, so a row never
       looks lopsided. */
    display:flex; flex-direction:column;
  }
  .lp-feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(52,95,207,.14); border-color: rgba(52,95,207,.3); }
  .lp-feature-icon { width:60px; height:60px; margin: 0 auto 18px; border-radius:16px;
    background: linear-gradient(135deg, #EBF0FF, #fff); display:flex; align-items:center; justify-content:center;
    font-size:26px; color:#345FCF; box-shadow: 0 4px 12px rgba(52,95,207,.1);
  }
  .lp-feature-card h3 { font-size:17px; font-weight:700; margin-bottom:8px; color:#2C3142; }
  .lp-feature-card p { font-size:13.5px; color:#8A8A8A; line-height:1.6; }

  .lp-dept-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 22px; }
  .lp-dept-card {
    position:relative; height:230px; border-radius:16px; overflow:hidden; display:block;
    text-decoration:none; color:#fff; box-shadow: 0 2px 8px rgba(20,25,40,.08);
    transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s;
  }
  .lp-dept-card:hover { transform: translateY(-5px); box-shadow: 0 16px 32px rgba(20,25,40,.22); }
  .lp-dept-photo {
    position:absolute; inset:0; background-size:cover; background-position:center;
    transition: transform .5s ease;
  }
  .lp-dept-card:hover .lp-dept-photo { transform: scale(1.08); }
  .lp-dept-card::after {
    content:''; position:absolute; inset:0; z-index:1;
    background: linear-gradient(180deg, rgba(20,25,40,0) 40%, rgba(20,25,40,.78) 100%);
  }
  .lp-dept-body {
    position:absolute; left:0; right:0; bottom:0; z-index:2; padding: 18px 18px 16px;
    text-align:left;
  }
  .lp-dept-card h4 { font-size:15px; font-weight:700; margin-bottom:3px; letter-spacing:.3px; }
  .lp-dept-card .count { font-size:11.5px; color:rgba(255,255,255,.82); }

  /* Super-Admin-only: choose which collections this page features. */
  .lp-coll-admin { display:flex; justify-content:center; margin: -28px 0 28px; }
  .lp-coll-admin button {
    display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-family:inherit;
    background:#fff; color:#345FCF; border:1.5px solid #D6DEF5;
    padding:9px 18px; border-radius:24px; font-size:12.5px; font-weight:600; transition: all .2s;
  }
  .lp-coll-admin button:hover { border-color:#345FCF; background:#EBF0FF; }

  .lp-coll-picker {
    max-width:640px; margin:0 auto 36px; background:#fff; border:1px solid #E5E8F0;
    border-radius:14px; padding:18px; box-shadow: 0 8px 28px rgba(20,25,40,.10);
  }
  .lp-coll-picker-head {
    display:flex; justify-content:space-between; align-items:center;
    font-size:13px; font-weight:700; color:#2C3142; margin-bottom:12px;
  }
  .lp-coll-count { font-size:11.5px; font-weight:600; color:#8A8A8A; }
  .lp-coll-list {
    display:grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap:6px;
    max-height:230px; overflow-y:auto; margin-bottom:14px;
  }
  .lp-coll-item {
    display:flex; align-items:center; gap:9px; padding:7px 9px; border-radius:8px;
    font-size:13px; color:#2C3142; cursor:pointer; transition: background .15s;
  }
  .lp-coll-item:hover { background:#F6F7FB; }
  .lp-coll-item input { width:15px; height:15px; accent-color:#345FCF; cursor:pointer; flex-shrink:0; }
  .lp-coll-err { font-size:12px; color:#C0392B; margin-bottom:10px; font-weight:600; }
  .lp-coll-actions { display:flex; align-items:center; gap:8px; }
  .lp-coll-actions button {
    cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:600;
    padding:8px 16px; border-radius:20px; transition: all .2s;
  }
  .lp-coll-actions button:disabled { opacity:.6; cursor:default; }
  .lp-coll-actions .ghost { background:#fff; color:#4A4A4A; border:1.5px solid #E5E8F0; }
  .lp-coll-actions .ghost:hover:not(:disabled) { border-color:#345FCF; color:#345FCF; }
  .lp-coll-actions .primary { background:#345FCF; color:#fff; border:1.5px solid #345FCF; }
  .lp-coll-actions .primary:hover:not(:disabled) { background:#2A4FB5; }
  .lp-coll-empty {
    text-align:center; color:#8A8A8A; font-size:13.5px; padding:36px 20px;
    border:1px dashed #E5E8F0; border-radius:14px;
  }

  .lp-cta-section {
    background: linear-gradient(135deg, #345FCF 0%, #2A4FB5 100%); color:#fff; padding:80px 48px; text-align:center;
  }
  .lp-cta-section h2 { font-size:36px; font-weight:800; color:#fff; margin-bottom:12px; }
  .lp-cta-section p { font-size:16px; opacity:.94; margin-bottom:32px; max-width:600px; margin-left:auto; margin-right:auto; }
  .lp-cta-buttons { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }

  .lp-footer { background:#1A1F2E; color:#B0B5C4; padding:48px 48px 24px; }
  .lp-footer-grid { max-width:1280px; margin:0 auto 32px; display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:40px; }
  .lp-footer h4 { color:#fff; font-size:13px; font-weight:700; margin-bottom:14px; text-transform: uppercase; letter-spacing:.8px; }
  .lp-footer p { font-size:13px; line-height:1.7; }
  .lp-footer ul { list-style:none; padding:0; }
  .lp-footer ul li { margin-bottom:8px; }
  .lp-footer ul li a { color:#B0B5C4; text-decoration:none; font-size:13px; transition: color .2s; }
  .lp-footer ul li a:hover { color:#fff; }
  .lp-footer-bottom { max-width:1280px; margin:0 auto; border-top:1px solid #2A2F3E; padding-top:20px; text-align:center; font-size:12px; }

  @media (max-width: 768px) {
    .lp-navbar { padding: 0 20px; }
    .lp-nav-links { display:none; }
    .lp-hero { padding: 80px 20px 90px; }
    .lp-hero h1 { font-size: 34px; }
    .lp-section { padding: 60px 20px; }
    .lp-footer-grid { grid-template-columns: 1fr; }
    .lp-cta-section { padding: 60px 20px; }
  }
`

// The cards previously hardcoded eight "departments" with invented item counts
// ("412 items"). They are now the real categories — which is also why the
// section is no longer called "Browse by Department": several of them
// (Faculty Research, Institutional Publications, Special Boholano Creations)
// were never departments at all.
//
// There used to be a FALLBACK_COVERS map here, pairing a category with a bundled
// image BY NAME. It has been deleted, for three reasons:
//   1. Every department category now carries its real seal in the database
//      (`php artisan categories:restore-covers`), so there is nothing to fall
//      back to.
//   2. It keyed on names like 'CAST', which stopped matching the moment the
//      categories were renamed to their full titles — it was already dead.
//   3. It was wrong: it paired "Graduate Studies" with education.jpg, which is
//      the College of EDUCATION seal. GS was displaying COE's logo.
//
// A category with no cover gets a plain brand panel — NOT a stand-in photo.
// Putting the generic MDC seal on some collections and not others reads as a
// bug rather than a decision.
const BRAND_PLACEHOLDER = 'linear-gradient(135deg, #345FCF, #2A4FB5)'

const DEFAULT_HERO = '/images/library-system.png'

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—')

export default function LandingPage() {
  const { user, isAdmin } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const homePath = isAdmin ? '/admin' : '/dashboard'

  const [data, setData] = useState(null)
  const [heroBusy, setHeroBusy] = useState(false)
  const [heroError, setHeroError] = useState('')
  const fileRef = useRef(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [allCategories, setAllCategories] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [pickerBusy, setPickerBusy] = useState(false)
  const [pickerError, setPickerError] = useState('')

  const load = () => landingApi.get().then(res => setData(res.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const stats = data?.stats
  const collections = data?.collections || []

  const heroImage = data?.hero_image_path
    ? `${apiOrigin}/storage/${data.hero_image_path}`
    : DEFAULT_HERO

  const coverStyle = (d) => ({
    backgroundImage: d.cover_image_path
      ? `url('${apiOrigin}/storage/${d.cover_image_path}')`
      : BRAND_PLACEHOLDER,
  })

  const pickHero = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked after an error
    if (!file) return
    setHeroBusy(true); setHeroError('')
    try {
      await landingApi.updateHero(file)
      await load()
    } catch (err) {
      const d = err?.response?.data
      setHeroError(d?.errors?.image?.[0] || d?.message || 'Could not update the image.')
    } finally {
      setHeroBusy(false)
    }
  }

  const resetHero = async () => {
    setHeroBusy(true); setHeroError('')
    try {
      await landingApi.resetHero()
      await load()
    } catch {
      setHeroError('Could not reset the image.')
    } finally {
      setHeroBusy(false)
    }
  }

  // --- Featured collections (Super Admin) ---------------------------------
  // The landing payload only returns the collections that are CURRENTLY shown,
  // so picking from it alone could never re-add a hidden one. The editor pulls
  // the full category list separately and treats the payload as the "checked"
  // set.
  const openPicker = async () => {
    setPickerError('')
    setSelectedIds(collections.map(c => c.id))
    setPickerOpen(true)
    if (!allCategories.length) {
      try {
        const res = await categoriesApi.list()
        setAllCategories(res.data?.data || res.data || [])
      } catch {
        setPickerError('Could not load the collections.')
      }
    }
  }

  const toggleId = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const savePicker = async () => {
    setPickerBusy(true); setPickerError('')
    try {
      await landingApi.updateCollections(selectedIds)
      await load()
      setPickerOpen(false)
    } catch {
      setPickerError('Could not save the selection.')
    } finally {
      setPickerBusy(false)
    }
  }

  // Distinct from saving every ID: this clears the setting, so collections
  // added later show up automatically instead of staying invisible until
  // someone remembers to tick them.
  const showAll = async () => {
    setPickerBusy(true); setPickerError('')
    try {
      await landingApi.resetCollections()
      await load()
      setPickerOpen(false)
    } catch {
      setPickerError('Could not reset the selection.')
    } finally {
      setPickerBusy(false)
    }
  }

  return (
    <div className="landing-body">
      <style>{landingStyles}</style>
      <div className="landing-wrapper">
        <nav className="lp-navbar">
          <div className="lp-logo-area">
            <img src={MDC_LOGO} alt="MDC" className="lp-logo-img" />
            <div className="lp-divider"></div>
            <div>
              <div className="lp-brand-main">TIPIGANAN</div>
              <div className="lp-brand-sub">MDC Repository</div>
            </div>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#collections">Collections</a>
            <a href="#about">About</a>
          </div>
          {/* Until signed-in users could reach this page at all, the navbar
              always assumed a guest — so a logged-in Super Admin coming here to
              edit the hero was greeted with "Sign In". Reflect who's actually
              looking at it. */}
          <div className="lp-nav-actions">
            {user ? (
              <Link to={homePath} className="lp-btn-primary">
                <i className="fas fa-th-large"></i> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="lp-btn-outline"><i className="fas fa-sign-in-alt"></i> Sign In</Link>
                <Link to="/register" className="lp-btn-primary"><i className="fas fa-user-plus"></i> Get Started</Link>
              </>
            )}
          </div>
        </nav>

        {/* A heavier scrim than a photo would need: the default image is the MDC
            banner, which has its own headline and an email strip baked in. The
            darker wash pushes all of that back to texture so the page's own
            headline stays the only thing being read. A Super Admin who uploads a
            plain photo still gets a normal, legible hero out of it. */}
        <section className="lp-hero" style={{ backgroundImage:
          `linear-gradient(105deg, rgba(12,20,45,0.82) 0%, rgba(12,20,45,0.62) 100%), url('${heroImage}')` }}>
          <div className="lp-hero-container">
            <div className="lp-badge"><i className="fas fa-shield-alt"></i> Secure Academic Repository</div>
            <h1>Preserving Knowledge,<br />Empowering <span>Research</span></h1>
            <p>TIPIGANAN is the official MDC online repository of special and rare collections — a digitally preserved home for thesis manuscripts, faculty research, institutional publications, and Boholano academic heritage.</p>
            <div className="lp-hero-actions">
              {user ? (
                <Link to={homePath} className="lp-hero-cta">
                  <i className="fas fa-th-large"></i> Go to Dashboard
                </Link>
              ) : (
                <Link to="/register" className="lp-hero-cta">
                  <i className="fas fa-rocket"></i> Get Started
                </Link>
              )}
              <Link to="/browse" className="lp-hero-secondary"><i className="fas fa-book-open"></i> Browse Collections</Link>
            </div>
          </div>

          {/* Super Admin only — swap the hero image without touching the repo. */}
          {isSuperAdmin && (
            <div className="lp-hero-edit">
              {heroError && <span className="lp-hero-err">{heroError}</span>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                     onChange={pickHero} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={heroBusy}>
                <i className="fas fa-image"></i> {heroBusy ? 'Saving…' : 'Change image'}
              </button>
              {data?.hero_image_path && (
                <button type="button" onClick={resetHero} disabled={heroBusy}>
                  <i className="fas fa-rotate-left"></i> Reset
                </button>
              )}
            </div>
          )}
        </section>

        {/* Real counts from the database — these were invented figures before. */}
        <div className="lp-stat-strip">
          <div><div className="value">{fmt(stats?.total_theses)}</div><div className="label">Total Items</div></div>
          <div><div className="value">{fmt(stats?.total_categories)}</div><div className="label">Collections</div></div>
          <div><div className="value">{fmt(stats?.total_users)}</div><div className="label">Users</div></div>
          <div><div className="value">{fmt(stats?.total_views)}</div><div className="label">Total Views</div></div>
        </div>

        <section className="lp-section" id="features">
          <div className="lp-container">
            <h2>Built for Academic Excellence</h2>
            <p className="subtitle">Everything you need to discover, read, and preserve scholarly work at Mater Dei College.</p>
            {/* Six cards, three per row. Every claim below is one the system
                actually delivers — see the notes on the two that were not. */}
            <div className="lp-features-grid">
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-search"></i></div>
                <h3>Powerful Search</h3>
                {/* Was "...and full-text OCR content". Nothing stores or indexes
                    the full text: Thesis::toSearchableArray indexes title,
                    authors, adviser, abstract and keywords, and OCR writes only
                    the abstract and keywords back. */}
                <p>Search titles, authors, advisers, abstracts, and keywords at once — typo-tolerant, and still working even if the search engine goes down.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-shield-alt"></i></div>
                <h3>Secure Viewing</h3>
                {/* Was "...screenshots disabled". A browser cannot disable a
                    screenshot — the viewer blocks Ctrl+P/S/C, right-click, F12
                    and the print dialog, but nothing stops Win+Shift+S or a
                    phone camera. The watermark is the actual protection, so say
                    that instead of promising something we cannot enforce. */}
                <p>Read-only in the browser. Downloading, printing, copying, and right-click are blocked, and every page is watermarked with the reader's identity.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-file-import"></i></div>
                <h3>Scanned Works, Readable</h3>
                <p>Image-only scans of older manuscripts are read by OCR, so their abstract and keywords are recovered and become searchable like any other item.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-bookmark"></i></div>
                <h3>Personal Library</h3>
                <p>Bookmark items, keep a private reading history, and pick up right where you left off.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-quote-right"></i></div>
                <h3>Citation Generator</h3>
                <p>Generate APA and MLA citations instantly, ready to paste into your paper.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-chart-line"></i></div>
                <h3>Analytics &amp; Reports</h3>
                {/* Was "most-viewed items" — there is no such report. The six
                    that exist: dashboard, most-cited, most-searched,
                    by-department, by-year, users-online. */}
                <p>Staff see most-cited works, most-searched keywords, and usage by department, year, and hour — each exportable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Was "Browse by Department" — but the categories are no longer only
            departments (Faculty Research, Institutional Publications, Special
            Boholano Creations, Special Collections). "Collections" is what they
            actually are, and it matches the repository's own name. */}
        <section className="lp-section" id="collections" style={{background:'var(--bg-white)'}}>
          <div className="lp-container">
            <h2>Explore the Collections</h2>
            <p className="subtitle">Browse the archive by collection — academic departments, faculty research, institutional publications, and Boholano special collections.</p>

            {isSuperAdmin && (
              <div className="lp-coll-admin">
                <button type="button" onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}>
                  <i className="fas fa-sliders"></i> Choose which collections to show
                </button>
              </div>
            )}

            {isSuperAdmin && pickerOpen && (
              <div className="lp-coll-picker">
                <div className="lp-coll-picker-head">
                  <span>Shown on this page</span>
                  <span className="lp-coll-count">{selectedIds.length} of {allCategories.length} selected</span>
                </div>

                {allCategories.length === 0 && !pickerError && (
                  <div className="lp-coll-empty"><i className="fas fa-spinner fa-spin"></i> Loading…</div>
                )}

                <div className="lp-coll-list">
                  {allCategories.map(c => (
                    <label key={c.id} className="lp-coll-item">
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleId(c.id)} />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>

                {pickerError && <div className="lp-coll-err">{pickerError}</div>}

                <div className="lp-coll-actions">
                  <button type="button" className="ghost" onClick={showAll} disabled={pickerBusy}
                          title="Clear the selection so every collection shows, including any added later">
                    Show all
                  </button>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="ghost" onClick={() => setPickerOpen(false)} disabled={pickerBusy}>
                    Cancel
                  </button>
                  <button type="button" className="primary" onClick={savePicker} disabled={pickerBusy}>
                    {pickerBusy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {collections.length === 0 ? (
              <div className="lp-coll-empty">
                {isSuperAdmin
                  ? 'No collections are being shown. Use "Choose which collections to show" above.'
                  : 'No collections to show yet.'}
              </div>
            ) : (
              <div className="lp-dept-grid">
                {collections.map(c => (
                  // Carries the category through to Browse, which already reads
                  // ?category_id — so the card lands on that collection's items,
                  // not an unfiltered list.
                  <Link to={`/browse?category_id=${c.id}`} key={c.id} className="lp-dept-card">
                    <div className="lp-dept-photo" style={coverStyle(c)}></div>
                    <div className="lp-dept-body">
                      <h4>{c.name}</h4>
                      <div className="count">{c.total === 1 ? '1 item' : `${fmt(c.total)} items`}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Asking someone who is already signed in to "Create Free Account" and
            "Sign In" reads as a bug. Pitch to guests; give members somewhere to
            actually go. */}
        <section className="lp-cta-section" id="about">
          {user ? (
            <>
              <h2>Pick Up Where You Left Off</h2>
              <p>Your bookmarks, reading history, and the full MDC special collections are a click away.</p>
              <div className="lp-cta-buttons">
                <Link to={homePath} className="lp-hero-cta" style={{color:'#345FCF'}}>
                  <i className="fas fa-th-large"></i> Go to Dashboard
                </Link>
                <Link to="/browse" className="lp-hero-secondary">
                  <i className="fas fa-book-open"></i> Browse Collections
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>Ready to Explore MDC's Academic Heritage?</h2>
              <p>Join students, faculty, and researchers already using TIPIGANAN to access special collections and rare academic works.</p>
              <div className="lp-cta-buttons">
                <Link to="/register" className="lp-hero-cta" style={{color:'#345FCF'}}><i className="fas fa-user-plus"></i> Create Free Account</Link>
                <Link to="/login" className="lp-hero-secondary"><i className="fas fa-sign-in-alt"></i> Sign In</Link>
              </div>
            </>
          )}
        </section>

        <footer className="lp-footer">
          <div className="lp-footer-grid">
            <div>
              <h4>TIPIGANAN</h4>
              <p>MDC Online Repository of Special and Rare Collections. Digitally preserving academic heritage for Mater Dei College.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <ul>
                <li><Link to="/browse">Browse</Link></li>
                <li><a href="#collections">Collections</a></li>
              </ul>
            </div>
            <div>
              <h4>Account</h4>
              <ul>
                {user ? (
                  <>
                    <li><Link to={homePath}>Dashboard</Link></li>
                    <li><Link to="/profile">My Profile</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login">Sign In</Link></li>
                    <li><Link to="/register">Register</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4>Institution</h4>
              <ul>
                <li><a href="https://materdeicollege.com" target="_blank" rel="noreferrer">Mater Dei College</a></li>
                <li><a href="#about">About TIPIGANAN</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            © 2026 Mater Dei College — TIPIGANAN. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}