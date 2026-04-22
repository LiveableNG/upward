'use client'

import React from 'react'
import { PageHeader } from '@/components/common/PageHeader'

export default function CookiesPolicyPage() {
  return (
    <div className="legal-content-page dashboard--nav-offset">
      <PageHeader
        title="Cookies Policy"
        showBack
        backPath="/dashboard/legal"
        showSettings={false}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="legal-document">
            <header className="legal-document__header">
              <p className="legal-document__update-date">Last updated: March 17, 2026</p>
            </header>

            <section className="legal-document__content">
              <p>
                Liveable Smartcity Technologies uses Cookies to identify the areas of our Website that
                you have visited. A Cookie is a small piece of data stored on your web browser by a
                website. Cookies help us recognise your browser, collect analytics, and remember
                preferences (like language or login information) to enhance your experience on our
                Website.
              </p>

              <h2>1. What are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device when you visit a website. 
                They are widely used to make websites work more efficiently and to provide information 
                to the owners of the site.
              </p>

              <h2>2. How we use Cookies</h2>
              <p>
                We use Cookies to enhance the performance and functionality of our Website but they are
                non-essential to its use. For instance, a cookie may allow you to access our Services
                without having to repeatedly enter your password during a single visit.
              </p>
              <p>
                In all cases in which we use Cookies, we will not collect Personal Data except with your
                permission or use information gathered for tracking purposes. We never store Personal
                Data in Cookies.
              </p>

              <h2>3. Blocking and Disabling Cookies</h2>
              <p>
                Wherever you are located, you may also set your browser to block Cookies and similar
                technologies, but this action may block our essential Cookies and prevent our Website
                from functioning properly, and you may not be able to fully utilise all of its features
                and services.
              </p>
              <p>
                Different browsers make different controls available to you. Disabling a cookie or
                category of Cookies does not delete the cookie from your browser; you will need to do
                this yourself from within your browser. You should visit your browser's help menu for
                more information.
              </p>

              <h2>4. Types of Cookies we use</h2>
              <ul>
                <li>
                  <strong>Essential Cookies:</strong> These cookies are strictly necessary to provide
                  you with services available through our Website.
                </li>
                <li>
                  <strong>Performance and Functionality Cookies:</strong> These cookies are used to
                  enhance the performance and functionality of our Website but are non-essential to
                  their use.
                </li>
                <li>
                  <strong>Analytics and Customization Cookies:</strong> These cookies collect
                  information that is used either in aggregate form to help us understand how our
                  Website is being used or to help us customise our Website for you.
                </li>
              </ul>

              <h2>5. Changes to our Cookie Policy</h2>
              <p>
                We may need to make changes to this Cookie Policy so that they accurately reflect our
                Services and policies. Unless otherwise required by law, we will notify you before we
                make changes and give you an opportunity to review them before they go into effect.
              </p>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .legal-document {
          background: var(--surface);
          border-radius: 24px;
          border: 1px solid var(--border);
          padding: 2.5rem 1.5rem;
          margin: 0 1rem 3rem 1rem;
        }
        .legal-document__header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .legal-document__update-date {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .legal-document__content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 2.5rem 0 1.25rem 0;
          letter-spacing: -0.01em;
        }
        .legal-document__content p {
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        .legal-document__content ul {
          list-style: none;
          padding: 0;
          margin-bottom: 2rem;
        }
        .legal-document__content li {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          position: relative;
        }
        .legal-document__content li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--clay);
          font-weight: bold;
        }
        .legal-document__content strong {
          color: var(--text);
          font-weight: 700;
        }
        @media (max-width: 768px) {
          .legal-document {
            padding: 1.5rem 1rem;
            margin: 0 0.75rem 2rem 0.75rem;
            border-radius: 20px;
          }
          .legal-document__content h2 {
            font-size: 1.25rem;
            margin: 2rem 0 1rem 0;
          }
          .legal-document__content p,
          .legal-document__content li {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  )
}
