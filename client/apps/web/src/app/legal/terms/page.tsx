import { LegalPageIntro } from '@/components/layout/legal-page-intro'

export default function TermsPage() {
  return (
    <>
      <LegalPageIntro title="Terms of Use" updated="March 17, 2026" />

      <section className="legal-content">
        <h2 className="legal-h2">1. Agreement to Terms</h2>
        <p>
          By using Liveable Smartcity Technologies’s Services or contacting us directly, you signify
          your acceptance of these Terms of Use and our Privacy Policy. If you do not agree to these
          terms, you should not engage with our Website or use our Services. Continued use of the
          Website, direct engagement with us, or following the posting of changes to these Terms will
          mean that you accept those changes.
        </p>

        <h2 className="legal-h2">2. Third-Party Services</h2>
        <p>
          We may display, include or make available third-party content (including data,
          information, applications and other product services) or provide links to third-party
          websites or services (Third-Party Services).
        </p>
        <p>
          You acknowledge and agree that Liveable Smartcity Technologies shall not be responsible for
          any Third-Party Services, including their accuracy, completeness, timeliness, validity,
          copyright compliance, legality, decency, quality, or any other aspect thereof. Liveable
          Smartcity Technologies does not assume and shall not have any liability or responsibility
          to you or any other person or entity for any Third-Party Services.
        </p>
        <p>
          Third-Party Services and links thereto are provided solely as a convenience to you, and you
          access and use them entirely at your own risk and subject to such third parties’ terms and
          conditions.
        </p>

        <h2 className="legal-h2">3. Links to Other Websites</h2>
        <p>
          Our Website may contain links to other websites not operated or controlled by Liveable
          Smartcity Technologies. We are not responsible for the content, accuracy, or opinions
          expressed in such websites, and such websites are not investigated, monitored, or checked
          for accuracy or completeness by us. When you use a link to go from this Website to another
          website, our policies are no longer in effect.
        </p>

        <h2 className="legal-h2">4. Governing Law</h2>
        <p>
          These Terms of Use and your use of our Services are governed by the laws of the Federal
          Republic of Nigeria, excluding its conflicts of law rules. You consent to the exclusive
          jurisdiction of the Nigerian courts in connection with any action or dispute arising
          between the parties under or in connection with these Terms.
        </p>
        <p>
          Your use of the Website may also be subject to other local, state, national, or
          international laws.
        </p>

        <h2 className="legal-h2">5. Intellectual Property</h2>
        <p>
          The Service and its original content, features and functionality are and will remain the
          exclusive property of Liveable Smartcity Technologies and its licensors. Our trademarks and
          trade dress may not be used in connection with any product or service without the prior
          written consent of Liveable Smartcity Technologies.
        </p>

        <h2 className="legal-h2">6. Changes to Our Terms</h2>
        <p>
          We may change our Services and policies, and we may need to make changes to these Terms so
          that they accurately reflect our Services and policies. Unless otherwise required by law,
          we will notify you before we make changes and give you an opportunity to review them
          before they go into effect. If you continue to use the Services after any change, you will
          be bound by the updated Terms.
        </p>
      </section>
    </>
  )
}
