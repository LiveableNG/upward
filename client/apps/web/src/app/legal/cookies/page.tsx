import { LegalPageIntro } from '@/components/layout/legal-page-intro'

export default function CookiesPage() {
  return (
    <>
      <LegalPageIntro title="Cookie Policy" updated="March 17, 2026" />

      <section className="legal-content">
        <h2 className="legal-h2">1. What are Cookies?</h2>
        <p>
          Liveable Smartcity Technologies uses Cookies to identify the areas of our Website that you
          have visited. A Cookie is a small piece of data stored on your web browser by a website.
          Cookies help us recognise your browser, collect analytics, and remember preferences (like
          language or login information) to enhance your experience on our Website.
        </p>

        <h2 className="legal-h2">2. How we use Cookies</h2>
        <p>
          We use Cookies to enhance the performance and functionality of our Website but they are
          non-essential to its use. For instance, a cookie may allow you to access our Services
          without having to repeatedly enter your password during a single visit.
        </p>
        <p>
          In all cases in which we use Cookies, we will not collect Personal Data except with your
          permission or use information gathered for tracking purposes. We never store Personal Data
          in Cookies.
        </p>

        <h2 className="legal-h2">3. Blocking and Disabling Cookies</h2>
        <p>
          Wherever you are located, you may also set your browser to block Cookies and similar
          technologies, but this action may block our essential Cookies and prevent our Website from
          functioning properly, and you may not be able to fully utilise all of its features and
          services.
        </p>
        <p>
          Different browsers make different controls available to you. Disabling a cookie or category
          of Cookies does not delete the cookie from your browser; you will need to do this yourself
          from within your browser. You should visit your browser&apos;s help menu for more
          information.
        </p>

        <h2 className="legal-h2">4. Types of Cookies we use</h2>
        <ul className="legal-list">
          <li>
            <strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you
            with services available through our Website.
          </li>
          <li>
            <strong>Performance and Functionality Cookies:</strong> These cookies are used to enhance
            the performance and functionality of our Website but are non-essential to their use.
          </li>
          <li>
            <strong>Analytics and Customization Cookies:</strong> These cookies collect information
            that is used either in aggregate form to help us understand how our Website is being used
            or to help us customise our Website for you.
          </li>
        </ul>

        <h2 className="legal-h2">5. Changes to our Cookie Policy</h2>
        <p>
          We may need to make changes to this Cookie Policy so that they accurately reflect our
          Services and policies. Unless otherwise required by law, we will notify you before we make
          changes and give you an opportunity to review them before they go into effect.
        </p>
      </section>
    </>
  )
}
