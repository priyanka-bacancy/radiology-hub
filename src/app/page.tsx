'use client'
import './landing.css'
import { useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  useEffect(() => {
    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(el => {
        if (el.isIntersecting) el.target.classList.add('visible')
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.animate-in').forEach(el => observer.observe(el))

    // Workflow steps
    document.querySelectorAll('.workflow-step').forEach((step) => {
      step.addEventListener('click', () => {
        document.querySelectorAll('.workflow-step').forEach(s => s.classList.remove('active'))
        step.classList.add('active')
      })
    })

    // Nav scroll
    const handleScroll = () => {
      const nav = document.querySelector('nav')
      if (!nav) return
      nav.style.borderBottomColor = window.scrollY > 40
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(255,255,255,0.10)'
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">RH</div>
          <span className="nav-logo-text">RadiologyHub</span>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#workflow">Workflow</a></li>
          <li><a href="#hospitals">Hospitals</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="nav-actions">
          <Link href="/login" className="btn-ghost">Sign In</Link>
          <Link href="/login" className="btn-primary">Get Started →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <div className="hero-badge-dot"></div>
            Cloud Radiology Platform
          </div>
          <h1 className="hero-title">
            Radiology that<br/>
            <span className="hero-title-accent">moves at the speed</span><br/>
            of diagnosis
          </h1>
          <p className="hero-subtitle">
            Enterprise-grade PACS and RIS for regional hospitals. AI-enhanced workflows, real-time collaboration, and DICOM viewing — all in the browser.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn-hero">Start Free Trial →</Link>
            <a href="#workflow" className="btn-hero-outline">Watch Demo</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">2.4M+</div>
              <div className="hero-stat-label">Studies Processed</div>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <div className="hero-stat-value">98.9%</div>
              <div className="hero-stat-label">Uptime SLA</div>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <div className="hero-stat-value">&lt;18min</div>
              <div className="hero-stat-label">Avg Turnaround</div>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <div className="hero-stat-value">HIPAA</div>
              <div className="hero-stat-label">Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <div className="dashboard-preview">
        <div className="dashboard-frame">
          <div className="dashboard-topbar">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <div className="dashboard-url">app.radiologyhub.io/studies</div>
          </div>
          <div className="dashboard-body">
            <div className="dash-sidebar">
              <div className="dash-logo">
                <div className="dash-logo-dot"></div>
                RadiologyHub
              </div>
              <div className="dash-nav-item active"><div className="dash-nav-dot"></div>Studies</div>
              <div className="dash-nav-item"><div className="dash-nav-dot"></div>Worklist</div>
              <div className="dash-nav-item"><div className="dash-nav-dot"></div>Reports</div>
              <div className="dash-nav-item"><div className="dash-nav-dot"></div>Analytics</div>
            </div>
            <div className="dash-main">
              <div className="dash-header">
                <div className="dash-title">Studies</div>
                <div className="dash-btn">+ Upload DICOM</div>
              </div>
              <div className="dash-table-header">
                <div>Patient</div><div>Modality</div><div>Priority</div><div>Status</div><div>Date</div>
              </div>
              <div className="dash-row">
                <div style={{color:'white',fontWeight:500}}>Amit Kumar Joshi</div>
                <div>CR · CHEST</div>
                <div><span className="badge badge-stat">STAT</span></div>
                <div><span className="badge badge-unread">Unread</span></div>
                <div style={{color:'var(--white-50)'}}>Today 09:14</div>
              </div>
              <div className="dash-row">
                <div style={{color:'white',fontWeight:500}}>Sunita R. Patel</div>
                <div>CR · ABDOMEN</div>
                <div><span className="badge badge-urgent">Urgent</span></div>
                <div><span className="badge badge-unread">Unread</span></div>
                <div style={{color:'var(--white-50)'}}>Today 08:52</div>
              </div>
              <div className="dash-row">
                <div style={{color:'white',fontWeight:500}}>Mohammed I. Sheikh</div>
                <div>CR · HAND</div>
                <div><span className="badge badge-routine">Routine</span></div>
                <div><span className="badge badge-progress">In Progress</span></div>
                <div style={{color:'var(--white-50)'}}>Today 07:30</div>
              </div>
              <div className="dash-row">
                <div style={{color:'white',fontWeight:500}}>Geeta H. Solanki</div>
                <div>CR · CHEST</div>
                <div><span className="badge badge-routine">Routine</span></div>
                <div><span className="badge badge-reported">Reported</span></div>
                <div style={{color:'var(--white-50)'}}>Yesterday</div>
              </div>
              <div className="dash-row">
                <div style={{color:'white',fontWeight:500}}>Ravi S. Pillai</div>
                <div>CR · SPINE</div>
                <div><span className="badge badge-stat">STAT</span></div>
                <div><span className="badge badge-unread">Unread</span></div>
                <div style={{color:'var(--white-50)'}}>Today 09:28</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOS */}
      <div className="logos-section">
        <div className="logos-label">Trusted by leading hospitals across India</div>
        <div className="logos-row">
          <div className="logo-item">Apollo Hospitals</div>
          <div className="logo-item">CIMS Hospital</div>
          <div className="logo-item">SAL Hospital</div>
          <div className="logo-item">Narayana Health</div>
          <div className="logo-item">Fortis Healthcare</div>
          <div className="logo-item">Max Healthcare</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="animate-in">
          <div className="section-label">Platform Features</div>
          <h2 className="section-title">Everything your radiology<br/>practice needs</h2>
          <p className="section-sub">From DICOM viewing to HL7 integration — built for radiologists, deployed in hours.</p>
        </div>
        <div className="features-grid animate-in" style={{transitionDelay:'0.1s'}}>
          <div className="feature-card">
            <div className="feature-icon">🖥️</div>
            <div className="feature-title">Web-Based DICOM Viewer</div>
            <p className="feature-desc">Full-featured viewer with Window/Level, zoom, pan, measurements, and hanging protocols. No plugins required.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <div className="feature-title">Smart Worklist</div>
            <p className="feature-desc">Priority-driven queue with real-time updates. STAT studies surface instantly. Assign, track, and manage radiologist workloads effortlessly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <div className="feature-title">Structured Reporting</div>
            <p className="feature-desc">Template-driven reports with auto-save and one-click sign. HL7 ORU^R01 messages sent automatically on finalisation.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <div className="feature-title">HIPAA-Compliant Auth</div>
            <p className="feature-desc">Role-based access control for radiologists, clinicians, and technicians. Row-level security ensures complete data isolation between institutions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏥</div>
            <div className="feature-title">Multi-Hospital Support</div>
            <p className="feature-desc">Full multi-tenancy out of the box. Each hospital sees only its own data. Deploy one platform across your entire network.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <div className="feature-title">HL7 & FHIR Integration</div>
            <p className="feature-desc">Seamless integration with your existing HIS via HL7 v2.5 messages. Signed reports auto-deliver to referring physicians in real time.</p>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="section" style={{paddingTop:0}}>
        <div className="animate-in">
          <div className="section-label">By the numbers</div>
          <h2 className="section-title">Results that speak<br/>for themselves</h2>
        </div>
        <div className="metrics-grid animate-in" style={{transitionDelay:'0.1s'}}>
          <div className="metric-card"><div className="metric-value">73%</div><div className="metric-label">Faster Turnaround</div></div>
          <div className="metric-card"><div className="metric-value">4.2×</div><div className="metric-label">More Studies / Day</div></div>
          <div className="metric-card"><div className="metric-value">98.9%</div><div className="metric-label">Uptime SLA</div></div>
          <div className="metric-card"><div className="metric-value">6hrs</div><div className="metric-label">To Deploy</div></div>
        </div>
      </section>

      {/* WORKFLOW */}
      <div className="workflow-section" id="workflow">
        <div className="section">
          <div className="workflow-grid">
            <div>
              <div className="section-label animate-in">How It Works</div>
              <h2 className="section-title animate-in" style={{transitionDelay:'0.1s'}}>From scan to<br/>signed report</h2>
              <div className="workflow-steps animate-in" style={{transitionDelay:'0.2s'}}>
                <div className="workflow-step active">
                  <div className="step-num">01</div>
                  <div>
                    <div className="workflow-step-title">Upload DICOM</div>
                    <p className="workflow-step-desc">Drag-and-drop DICOM files or connect via DICOM-send. Patient metadata parsed automatically from tags.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="step-num">02</div>
                  <div>
                    <div className="workflow-step-title">Review in Viewer</div>
                    <p className="workflow-step-desc">Open any study in the browser-based viewer. Adjust Window/Level, measure, annotate — no plugins needed.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="step-num">03</div>
                  <div>
                    <div className="workflow-step-title">Dictate Report</div>
                    <p className="workflow-step-desc">Use structured templates or voice-to-text. Auto-save drafts every 1.5 seconds so you never lose work.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="step-num">04</div>
                  <div>
                    <div className="workflow-step-title">Sign & Deliver</div>
                    <p className="workflow-step-desc">One click to finalise. HL7 ORU^R01 fires instantly to the HIS. Referring physician notified automatically.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="animate-in" style={{transitionDelay:'0.3s'}}>
              <div className="viewer-mockup">
                <div className="viewer-toolbar">
                  <div className="viewer-tool active">W/L</div>
                  <div className="viewer-tool">Pan</div>
                  <div className="viewer-tool">Zoom</div>
                  <div className="viewer-tool">Length</div>
                  <div className="viewer-tool">Angle</div>
                  <div style={{marginLeft:'auto',fontSize:'11px',color:'var(--white-50)'}}>Soft Tissue ▾</div>
                </div>
                <div className="viewer-canvas">
                  <div className="xray-sim">
                    <div className="xray-lung" style={{left:'10%',top:'15%',width:'35%',height:'55%'}}></div>
                    <div className="xray-lung" style={{right:'10%',top:'15%',width:'35%',height:'55%'}}></div>
                    <div className="xray-spine"></div>
                    <div className="xray-rib" style={{left:'18%',top:'22%',width:'28%',transform:'rotate(-8deg)'}}></div>
                    <div className="xray-rib" style={{right:'18%',top:'22%',width:'28%',transform:'rotate(8deg)'}}></div>
                    <div className="xray-rib" style={{left:'16%',top:'30%',width:'30%',transform:'rotate(-10deg)'}}></div>
                    <div className="xray-rib" style={{right:'16%',top:'30%',width:'30%',transform:'rotate(10deg)'}}></div>
                    <div className="xray-rib" style={{left:'14%',top:'38%',width:'32%',transform:'rotate(-12deg)'}}></div>
                    <div className="xray-rib" style={{right:'14%',top:'38%',width:'32%',transform:'rotate(12deg)'}}></div>
                    <div className="xray-rib" style={{left:'14%',top:'47%',width:'31%',transform:'rotate(-13deg)'}}></div>
                    <div className="xray-rib" style={{right:'14%',top:'47%',width:'31%',transform:'rotate(13deg)'}}></div>
                    <div className="xray-rib" style={{left:'15%',top:'56%',width:'29%',transform:'rotate(-11deg)'}}></div>
                    <div className="xray-rib" style={{right:'15%',top:'56%',width:'29%',transform:'rotate(11deg)'}}></div>
                    <div style={{position:'absolute',left:'22%',top:'35%',display:'flex',alignItems:'center',gap:'4px'}}>
                      <div style={{background:'#ffdd44',height:'1.5px',width:'80px',boxShadow:'0 0 4px rgba(255,220,0,0.6)'}}></div>
                      <span style={{color:'#ffdd44',fontSize:'10px',fontFamily:'monospace',textShadow:'0 0 4px rgba(255,220,0,0.8)'}}>8.4 cm</span>
                    </div>
                    <div style={{position:'absolute',top:'8px',left:'10px',fontSize:'10px',color:'rgba(255,255,255,0.4)',fontFamily:'monospace',lineHeight:1.8}}>
                      <div>PT: Amit Kumar Joshi</div>
                      <div>CR · CHEST PA</div>
                      <div>14 Mar 2026</div>
                    </div>
                    <div style={{position:'absolute',bottom:'8px',right:'10px',fontSize:'10px',color:'rgba(255,255,255,0.4)',fontFamily:'monospace',textAlign:'right'}}>
                      <div>W:400 L:40</div>
                      <div>Soft Tissue</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIAL */}
      <section className="section" id="hospitals">
        <div className="animate-in">
          <div className="section-label">Customer Story</div>
          <h2 className="section-title">What radiologists say</h2>
        </div>
        <div className="testimonial-card animate-in" style={{transitionDelay:'0.1s'}}>
          <p className="testimonial-text">
            "RadiologyHub transformed our workflow at Apollo. We went from a 4-hour average turnaround to under 45 minutes for routine studies. The worklist prioritisation alone has saved us from missing critical findings. It is the first PACS that our radiologists actually enjoy using."
          </p>
          <div className="testimonial-author">
            <div className="author-avatar">RM</div>
            <div>
              <div className="author-name">Dr. Rajesh Mehta</div>
              <div className="author-title">Chief Radiologist · Apollo Hospitals Ahmedabad</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <div className="section-label" style={{textAlign:'center',marginBottom:'20px'}}>Ready to get started?</div>
          <h2 className="cta-title">Deploy in hours,<br/>not months</h2>
          <p className="cta-sub">No hardware. No installation. Just better radiology.</p>
          <div className="cta-actions">
            <Link href="/login" className="btn-hero">Start Free Trial →</Link>
            <a href="mailto:hello@radiologyhub.io" className="btn-hero-outline">Contact Sales</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-copy">© 2026 RadiologyHub. All rights reserved.</div>
        <ul className="footer-links">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">HIPAA</a></li>
          <li><Link href="/login">Sign In</Link></li>
        </ul>
      </footer>
    </>
  )
}
