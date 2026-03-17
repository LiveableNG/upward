'use client'
import { LegalHeader } from '@/components/layout/legal-header'
import { Footer } from '@/components/layout/footer'

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: '#faf9f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LegalHeader />

      <main
        className="legal-main container-padding"
        style={{
          flex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
          color: '#141413',
        }}
      >
        <header style={{ marginBottom: '80px' }}>
          <h1
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(40px, 6vw, 56px)',
              fontWeight: 500,
              marginBottom: '32px',
              color: '#141413',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Privacy Policy
          </h1>
          <div
            style={{
              height: '1px',
              width: '60px',
              background: 'var(--accent)',
              marginBottom: '32px',
            }}
          />
          <p
            style={{
              fontSize: '18px',
              color: '#5e5d59',
              lineHeight: 1.55,
              maxWidth: '640px',
            }}
          >
            Last updated: March 17, 2026
          </p>
        </header>

        <section
          className="legal-content"
          style={{
            fontFamily: 'serif',
            fontSize: '18px',
            lineHeight: 1.7,
            color: '#141413',
          }}
        >
          <p style={{ marginBottom: '32px' }}>
            Liveable Smartcity Technologies Limited is committed to safeguarding your privacy and
            protecting your Personal Data. This Privacy Policy outlines how we collect, use, store,
            and disclose Personal Data in the course of operating our platform (collectively, our
            Services).
          </p>
          <p style={{ marginBottom: '32px' }}>
            This Privacy Policy applies to information collected through our Website, subdomains,
            platforms, and other channels related to our Services. By accessing or using our
            Services, you confirm that you have read, understood, and agree to the collection, use,
            Processing, and disclosure of your Personal Data as described in this Privacy Policy and
            in accordance with our Terms of Service.
          </p>
          <p style={{ marginBottom: '48px' }}>
            This Privacy Policy explains how Liveable Smartcity Technologies collects and Processes
            your Personal Data that we collect and the measures we have in place to ensure the
            confidentiality of your Personal Data.
          </p>

          <h2 className="legal-h2">Definitions and key terms</h2>
          <p style={{ marginBottom: '24px' }}>
            To help you understand this Privacy Policy clearly, the following defined terms are used
            throughout:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Cookie:</strong> A small piece of data stored on your web browser by a
              website. Cookies help us recognise your browser, collect analytics, and remember
              preferences (like language or login information) to enhance your experience on our
              Website.
            </li>
            <li>
              <strong>Company:</strong> When this Privacy Policy mentions “Company”, “we”, “us” or
              “our” it refers to Liveable Smartcity Technologies, which is responsible for your
              Personal Data under this Privacy Policy.
            </li>
            <li>
              <strong>Contact Data:</strong> Includes information such as your address (billing and
              operational), email address, and telephone numbers provided to us when engaging our
              Services or making inquiries.
            </li>
            <li>
              <strong>Country:</strong> Refers to the Federal Republic of Nigeria, being the
              domicile of Data Subjects whose Personal Data Liveable Smartcity Technologies is
              processed.
            </li>
            <li>
              <strong>Customer:</strong> Refers to any company, organisation, or individual who
              engages Liveable Smartcity Technologies for its Services.
            </li>
            <li>
              <strong>Data Protection Laws:</strong> Means the Nigeria Data Protection Act, 2023,
              the Nigeria Data Protection Act General Application and Implementation Directive,
              2025, and any other ancillary laws regulating the use of Data in the Country.
            </li>
            <li>
              <strong>Data Subject:</strong> Any identifiable natural person whose Personal Data is
              collected, stored, transmitted, or otherwise Processed by Liveable Smartcity
              Technologies in the course of its business operations.
            </li>
            <li>
              <strong>Device:</strong> Any internet-enabled equipment such as a smartphone,
              computer, tablet, or any other device used to interact with our Services or platforms.
            </li>
            <li>
              <strong>Identity Data:</strong> Includes personal identifiers such as your full name,
              gender, date of birth, identification number, and other similar information.
            </li>
            <li>
              <strong>IP address:</strong> Means a unique string of numbers assigned to your device
              when it connects to the internet. It may indicate the geographic location of the
              device accessing our systems or Website.
            </li>
            <li>
              <strong>NDPC:</strong> Refers to the Nigeria Data Protection Commission, the
              regulatory body overseeing data protection and privacy compliance in the Country.
            </li>
            <li>
              <strong>Personnel:</strong> Refers to individuals employed by Liveable Smartcity
              Technologies or contracted to provide services on Liveable Smartcity Technologies’s
              behalf, including software engineers, consultants, or support staff.
            </li>
            <li>
              <strong>Personal Data:</strong> Any information relating to an identified or
              identifiable natural person.
            </li>
            <li>
              <strong>Processing, Process, or Processed:</strong> means any activity that involves
              the use of Personal Data or as the Data Protection Laws may otherwise define
              processing, processes or process. It includes any operation or set of operations which
              are performed on Personal Data or on sets of Personal Data, whether or not by
              automated means, such as collection, recording, organisation, structuring, storage,
              adaptation or alteration, retrieval, consultation, use, disclosure by transmission,
              dissemination or otherwise making available, alignment or combination, restriction,
              erasure or destruction. Processing also includes transferring Personal Data to third
              parties but does not include the mere transit of Personal Data originating outside the
              Country.
            </li>
            <li>
              <strong>Services:</strong> Refers to the suite of enterprise-AI data and insight
              solutions provided by Liveable Smartcity Technologies and related support services.
            </li>
            <li>
              <strong>Technical Data:</strong> Includes information such as your IP address, login
              data, browser type and version, time zone setting, device model, platform, and
              technology used to access our Website or systems.
            </li>
            <li>
              <strong>Website:</strong> Liveable Smartcity Technologies’s website
            </li>
            <li>
              <strong>You:</strong> Refers to the individual or entity (e.g., client, visitor) who
              interacts with Liveable Smartcity Technologies or uses its Services and whose Personal
              Data may be collected or Processed by us.
            </li>
          </ul>

          <h2 className="legal-h2">Who We Are and How to Contact Us</h2>
          <p style={{ marginBottom: '24px' }}>
            Liveable Smartcity Technologies, with its business address at [Funsho Link Street, Iwaya
            Yaba], is committed to protecting your privacy. This Privacy Policy is issued by
            Liveable Smartcity Technologies in its individual capacity. If, in the future, Liveable
            Smartcity Technologies operates through subsidiaries, affiliates, or other related
            entities, references to “we”, “us” or “our” in this Privacy Policy will be deemed to
            include such entities where applicable.
          </p>
          <p style={{ marginBottom: '24px' }}>
            Liveable Smartcity Technologies is the controller and processor, and is responsible for
            your Personal Data.
          </p>
          <p style={{ marginBottom: '24px' }}>
            We have appointed a data protection officer (DPO) who is responsible for overseeing
            questions in relation to this Privacy Policy. If you have any questions about this
            Privacy Policy, including any requests to exercise your legal rights, please contact the
            DPO using the information set out below:
          </p>
          <p style={{ marginBottom: '48px' }}>
            Email address: hello@goodtenants.africa
            <br />
            Postal address: [Funsho Link Street, Iwaya Yaba]
          </p>

          <h2 className="legal-h2">What Personal Data Do We Collect?</h2>
          <p style={{ marginBottom: '24px' }}>
            We collect Personal Data from you when you interact with us, such as when you visit our
            Website, complete an inquiry or registration form, request our Services, integrate your
            system into our platform to access our Services, subscribe to our communications, or
            participate in a survey. The Personal Data we collect may include your full name, email
            address, phone number, company name, job title, and location (city/country).
          </p>
          <p style={{ marginBottom: '48px' }}>
            In the course of delivering our Services, we may also collect additional information
            necessary for service delivery or compliance with legal obligations.
          </p>

          <h2 className="legal-h2">Why Do We Collect the Information We Collect?</h2>
          <p style={{ marginBottom: '24px' }}>
            We collect the information to process your data based on the following:
          </p>
          <ul className="legal-list">
            <li>Because you have granted us consent to do so.</li>
            <li>
              Because we require it to perform our obligations under our terms and conditions and
              other contractual obligations.
            </li>
            <li>
              To comply with legislative and regulatory requirements, especially as it relates to
              taxation and social security contributions.
            </li>
            <li>For our legitimate interest.</li>
            <li>To protect your vital interests; or</li>
            <li>For public interest.</li>
          </ul>

          <h2 className="legal-h2">How Do We Use the Personal Data We Collect?</h2>
          <p style={{ marginBottom: '24px' }}>
            The Personal Data we collect from you may be used in the following ways:
          </p>
          <ul className="legal-list">
            <li>
              <strong>To deliver our Services effectively.</strong> Your information enables us to
              provide tailoured suite of enterprise-AI data and insight solutions.
            </li>
            <li>
              <strong>To personalise your experience.</strong> We use your Data to better understand
              your specific needs and preferences, so we can offer relevant services and support.
            </li>
            <li>
              <strong>To improve our offerings.</strong> Feedback and data you provide help us
              refine our Services, digital platforms, and user experience.
            </li>
            <li>
              <strong>To enhance customer support.</strong> Your information helps us respond more
              efficiently to inquiries, requests, or service-related issues.
            </li>
            <li>
              <strong>To administer surveys or Service reviews.</strong> This helps us gain insights
              into client satisfaction and areas for improvement.
            </li>
            <li>
              <strong>To communicate with you.</strong> We may use your contact details to send you
              Services updates, newsletters, promotional content (where permitted), or respond to
              inquiries.
            </li>
          </ul>

          <h2 className="legal-h2">How Do We Use Your Email Address?</h2>
          <p style={{ marginBottom: '24px' }}>
            By submitting your email address on this Website, you agree to receive emails from us.
            You can cancel your participation in any of these email lists at any time by clicking on
            the opt-out link or other unsubscribe option that is included in the respective email.
            We only send emails to people who have authorised us to contact them, either directly,
            or through a third party. We do not send unsolicited commercial emails.
          </p>
          <p style={{ marginBottom: '48px' }}>
            By submitting your email address, you also agree to allow us to use your email address
            for customer audience targeted on sites like Facebook, where we display custom
            advertising to specific people who have opted in to receive communications from us.
          </p>

          <h2 className="legal-h2">Sharing Information With Third Parties</h2>
          <p style={{ marginBottom: '24px' }}>
            We may engage trusted third-party service providers to support the delivery of our
            Services, including but not limited to website hosting, server maintenance, data storage
            and management, email communication, analytics, and customer support. Where necessary,
            we may share your Personal Data and, in some cases, non-Personal Data with these service
            providers to enable them to perform such tasks on our behalf.
          </p>
          <p style={{ marginBottom: '24px' }}>
            For analytics and Service improvement, we may share anonymised or aggregated usage Data,
            such as IP addresses or browser types, with third-party analytics partners. This
            information may be used to help us understand user behaviour, optimise our digital
            platforms, and evaluate Service performance.
          </p>
          <p style={{ marginBottom: '24px' }}>
            we may disclose your Personal Data or non-Personal Data where we believe it is necessary
            or appropriate to:
          </p>
          <ul className="legal-list">
            <li>
              Comply with applicable laws, regulations, or legal processes (such as court orders or
              subpoenas).
            </li>
            <li>Respond to lawful requests from government or law enforcement agencies.</li>
            <li>
              Protect the rights, property, or safety of Liveable Smartcity Technologies, our users,
              our Personnel, or others.
            </li>
            <li>Detect, investigate, and help prevent fraud or other illegal activity.</li>
          </ul>
          <p style={{ marginBottom: '48px' }}>
            We require all third parties with whom we share your Personal Data to respect its
            confidentiality and to Process it in accordance with applicable Data Protection Laws.
            They are not permitted to use your Personal Data for their own purposes and are only
            authorised to Process it as instructed by Liveable Smartcity Technologies and solely for
            specified and legitimate purposes.
          </p>

          <h2 className="legal-h2">Where and When Information is Collected</h2>
          <p style={{ marginBottom: '24px' }}>
            Liveable Smartcity Technologies will collect the personal information that you submit to
            us including:
          </p>
          <ul className="legal-list">
            <li>
              Your direct disclosures to us when you onboard on our platform or access our Website.
            </li>
            <li>
              Your personal information disclosed from the use our Services, primarily in relation
              to customer accounts, administrators, and team members on our platform.
            </li>
            <li>
              Your communication to us through our customer support channels, email, chat,
              telephone, or any other means.
            </li>
            <li>
              Your reading of our emails or notices, online research on social media and websites
              which may not be publicly available.
            </li>
            <li>
              Investigations on publicly available databases in furtherance of our compliance
              obligations.
            </li>
            <li>
              Your participation in surveys which we make available to you, for competitions and
              promotions.
            </li>
            <li>
              Third parties such as regulatory and enforcement agencies, and other public sources.
            </li>
          </ul>

          <h2 className="legal-h2">Security of Your Information</h2>
          <p style={{ marginBottom: '48px' }}>
            We take precautions to protect the security of your information. We have physical,
            electronic, and managerial procedures to help safeguard, prevent unauthorised access,
            maintain data security, and correctly use your Personal Data. However, neither people
            nor security systems are foolproof, including encryption systems. In addition, people
            can commit intentional crimes, make mistakes, or fail to follow policies. Therefore,
            while we use reasonable efforts to protect your Personal Data, we cannot guarantee its
            absolute security.
          </p>

          <h2 className="legal-h2">Legal Rights and Control</h2>
          <p style={{ marginBottom: '24px' }}>
            You have the right to request access, correction, erasure, or restriction of processing
            of your Personal Data. Specifically:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Request access:</strong> Commonly known as a “Data Subject Access Request”.
              This enables you to receive a copy of the Personal Data we hold about you.
            </li>
            <li>
              <strong>Request correction:</strong> This enables you to have any incomplete or
              inaccurate Personal Data we hold about you corrected.
            </li>
            <li>
              <strong>Request erasure:</strong> This enables you to ask us to delete or remove
              Personal Data where there is no good reason for us continuing to Process it.
            </li>
            <li>
              <strong>Object to processing:</strong> Where we are relying on a legitimate interest
              and there is something about your situation that impacts on your fundamental rights
              and freedoms.
            </li>
            <li>
              <strong>Request restriction:</strong> This enables you to ask us to suspend the
              Processing of your Personal Data in certain scenarios.
            </li>
            <li>
              <strong>Request transfer:</strong> We will provide your Personal Data in a structured,
              commonly used, machine-readable format.
            </li>
            <li>
              <strong>Withdraw consent:</strong> At any time where we are relying on consent to
              Process your Personal Data.
            </li>
          </ul>

          <h2 className="legal-h2">Remedies for Breach</h2>
          <p style={{ marginBottom: '24px' }}>
            In the case of a breach, a data breach procedure is established and maintained. Liveable
            Smartcity Technologies will investigate to determine if an actual breach has occurred
            and will take the actions required to manage such breach.
          </p>
          <p style={{ marginBottom: '48px' }}>
            In the event you believe we have breached any applicable law or this Privacy Policy, you
            have the right to file a complaint with the Nigeria Data Protection Commission. You may,
            however, contact our DPO to enable us to rectify such breach as soon as possible.
          </p>

          <h2 className="legal-h2">Cross-Border Transfers</h2>
          <p style={{ marginBottom: '48px' }}>
            Information collected via our Website may be transferred from time to time to our
            offices or Personnel or to third parties located throughout the world. Whenever we
            transfer your Personal Data out of the Country, we ensure a similar degree of protection
            is afforded to it by ensuring at least one of the safeguards is implemented as required
            by the NDPC.
          </p>

          <h2 className="legal-h2">Document Review History</h2>
          <div style={{ overflowX: 'auto', marginBottom: '64px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(20, 20, 19, 0.1)' }}>
                  <th style={{ padding: '16px 8px' }}>Version</th>
                  <th style={{ padding: '16px 8px' }}>Date</th>
                  <th style={{ padding: '16px 8px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(20, 20, 19, 0.05)' }}>
                  <td style={{ padding: '16px 8px' }}>1.0</td>
                  <td style={{ padding: '16px 8px' }}>March 17, 2026</td>
                  <td style={{ padding: '16px 8px' }}>
                    First draft approved by the Board of Liveable Smartcity Technologies. Drafted in
                    accordance with the NDPA and the NDPA GAID.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .legal-main {
          padding-top: 160px;
          padding-bottom: 128px;
        }
        .legal-h2 {
          font-family: serif;
          font-size: 28px;
          font-weight: 500;
          margin-top: 64px;
          margin-bottom: 32px;
          color: #141413;
          letter-spacing: -0.01em;
        }
        .legal-list {
          list-style: none;
          padding: 0;
          margin-bottom: 48px;
        }
        .legal-list li {
          margin-bottom: 16px;
          padding-left: 24px;
          position: relative;
          color: #3d3d3a;
        }
        .legal-list li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: var(--accent);
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .legal-main {
            padding-top: 100px !important;
            padding-bottom: 80px;
          }
          .legal-h2 {
            font-size: 24px;
            margin-top: 48px;
          }
          .container-padding {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
