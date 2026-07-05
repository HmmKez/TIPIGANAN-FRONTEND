import { Link } from 'react-router-dom'

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
  .lp-logo-img { width:52px; height:52px; object-fit:contain; border-radius:50%;
    background: linear-gradient(135deg, #EBF0FF, #ffffff); padding:3px;
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
  .lp-hero {
    background: linear-gradient(105deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%),
                url('/images/library-system.png');
    background-size: cover; background-position: center 35%;
    color: white; padding: 120px 48px 130px; position:relative;
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
  .lp-features-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:24px; }
  .lp-feature-card {
    background:#fff; border:1px solid #E5E8F0; border-radius:16px; padding:32px 24px;
    text-align:center; transition: all .3s;
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

// NOTE: image assigned per department based on best content match against
// what's in public/images. CAST/CCJ/CON/CABM-B/CABM-H are direct name
// matches. GS uses education.jpg (closest available fit). COE and SPC have
// no dedicated photo yet — department-studies.png and faculty.png are
// placeholders; swap in real department photos when available.
// NOTE: "department studies.png" had a space in the filename on disk —
// rename it to "department-studies.png" to match the path used below.
const DEPARTMENTS = [
  { code: 'CAST', name: 'Arts & Sciences', icon: 'fa-flask', count: '412 items', image: '/images/cast.jpg' },
  { code: 'CCJ', name: 'Criminal Justice', icon: 'fa-balance-scale', count: '188 items', image: '/images/ccj.jpg' },
  { code: 'COE', name: 'Engineering', icon: 'fa-microchip', count: '236 items', image: '/images/department-studies.png' },
  { code: 'CON', name: 'Nursing', icon: 'fa-heartbeat', count: '271 items', image: '/images/nursing.jpg' },
  { code: 'CABM-B', name: 'Business Mgmt.', icon: 'fa-chart-line', count: '203 items', image: '/images/business.jpg' },
  { code: 'CABM-H', name: 'Hospitality', icon: 'fa-hotel', count: '145 items', image: '/images/hospitality.jpg' },
  { code: 'GS', name: 'Graduate Studies', icon: 'fa-graduation-cap', count: '305 items', image: '/images/education.jpg' },
  { code: 'SPC', name: 'Special Collections', icon: 'fa-star', count: '96 items', image: '/images/faculty.png' },
]

export default function LandingPage() {
  return (
    <div className="landing-body">
      <style>{landingStyles}</style>
      <div className="landing-wrapper">
        <nav className="lp-navbar">
          <div className="lp-logo-area">
            <img src="https://sis.materdeicollege.com/img/MDC-Logo-clipped.png" alt="MDC" className="lp-logo-img" />
            <div className="lp-divider"></div>
            <div>
              <div className="lp-brand-main">TIPIGANAN</div>
              <div className="lp-brand-sub">MDC Repository</div>
            </div>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#departments">Departments</a>
            <a href="#about">About</a>
          </div>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-outline"><i className="fas fa-sign-in-alt"></i> Sign In</Link>
            <Link to="/register" className="lp-btn-primary"><i className="fas fa-user-plus"></i> Get Started</Link>
          </div>
        </nav>

        <section className="lp-hero">
          <div className="lp-hero-container">
            <div className="lp-badge"><i className="fas fa-shield-alt"></i> Secure Academic Repository</div>
            <h1>Preserving Knowledge,<br />Empowering <span>Research</span></h1>
            <p>TIPIGANAN is the official MDC online repository of special and rare collections — a digitally preserved home for thesis manuscripts, faculty research, institutional publications, and Boholano academic heritage.</p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-hero-cta"><i className="fas fa-rocket"></i> Get Started</Link>
              <Link to="/login" className="lp-hero-secondary"><i className="fas fa-book-open"></i> Browse Collections</Link>
            </div>
          </div>
        </section>

        <div className="lp-stat-strip">
          <div><div className="value">2,052+</div><div className="label">Total Items</div></div>
          <div><div className="value">8</div><div className="label">Departments</div></div>
          <div><div className="value">1,847</div><div className="label">Users</div></div>
          <div><div className="value">14K+</div><div className="label">Total Views</div></div>
        </div>

        <section className="lp-section" id="features">
          <div className="lp-container">
            <h2>Built for Academic Excellence</h2>
            <p className="subtitle">Everything you need to discover, read, and preserve scholarly work at Mater Dei College.</p>
            <div className="lp-features-grid">
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-search"></i></div>
                <h3>Powerful Search</h3>
                <p>Multi-field search across title, author, adviser, keywords, and full-text OCR content.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-shield-alt"></i></div>
                <h3>Secure Viewing</h3>
                <p>View-only PDF access with dynamic watermarks. Downloads, printing, and screenshots disabled.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-bookmark"></i></div>
                <h3>Personal Library</h3>
                <p>Bookmark items, track reading history, and pick up right where you left off.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-quote-right"></i></div>
                <h3>Citation Generator</h3>
                <p>Generate APA, MLA, and Chicago citations instantly, ready to paste into your paper.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-chart-line"></i></div>
                <h3>Analytics & Reports</h3>
                <p>Administrators access usage trends, most-viewed items, and departmental analytics.</p>
              </div>
              <div className="lp-feature-card">
                <div className="lp-feature-icon"><i className="fas fa-university"></i></div>
                <h3>MDC-Wide Coverage</h3>
                <p>Content from every MDC department: CAST, CCJ, COE, CON, CABM, Graduate Studies, and more.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="departments" style={{background:'#fff'}}>
          <div className="lp-container">
            <h2>Browse by Department</h2>
            <p className="subtitle">Explore collections curated by each college of Mater Dei.</p>
            <div className="lp-dept-grid">
              {DEPARTMENTS.map(d => (
                <Link to="/login" key={d.code} className="lp-dept-card">
                  <div className="lp-dept-photo" style={{ backgroundImage: `url('${d.image}')` }}></div>
                  <div className="lp-dept-body">
                    <h4>{d.code}</h4>
                    <div className="count">{d.name} · {d.count}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-cta-section" id="about">
          <h2>Ready to Explore MDC's Academic Heritage?</h2>
          <p>Join students, faculty, and researchers already using TIPIGANAN to access special collections and rare academic works.</p>
          <div className="lp-cta-buttons">
            <Link to="/register" className="lp-hero-cta" style={{color:'#345FCF'}}><i className="fas fa-user-plus"></i> Create Free Account</Link>
            <Link to="/login" className="lp-hero-secondary"><i className="fas fa-sign-in-alt"></i> Sign In</Link>
          </div>
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
                <li><Link to="/login">Browse</Link></li>
                <li><Link to="/login">Search</Link></li>
                <li><a href="#departments">Departments</a></li>
              </ul>
            </div>
            <div>
              <h4>Account</h4>
              <ul>
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Register</Link></li>
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