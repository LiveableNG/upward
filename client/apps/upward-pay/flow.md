```DirectPay - 
Problem: Some users will not pay online, they want to pay to an existing account number that they are used to


Solution: 
Allow users to add a new account number to their existing property or property managers can add a new account number to their property
The account number will be used to pay the rent
User will be able to upload a proof of payment to the system
The PM will be able to approve the payment
Upward score will be calculated based on the payment history


Flow A [Tenant]:
Property manager will make a rent request
Tenant will be able to add a new account number to their existing property
Tenant will be able to upload a proof of payment to the system
The PM will be able to approve the payment
Upward score will be calculated based on the payment history

Flow B [Property Manager - Upward/GT]:
PM will attach a new account number to their property
The account number will be shown to the tenant
Tenant will be able to pay the rent to the new account number
Tenant will be able to upload a proof of payment to the system
The PM will be able to approve the payment
Upward score will be calculated based on the payment history

Note: For GT, we need api endpoints and webhooks to be able to integrate with the existing system



Phone number-only onboarding -
Problem: Users want to be able to onboard without email address

Solution:
Allow users to onboard without email address
The user will be able to login with their phone number
The user will be able to complete the onboarding process
The user will be able to verify their phone number
The user will be able to receive a verification code to their phone number
The user will be able to receive notifications from the system to their phone number

Flow A [Tenant]:
User on the tenant side can choose to use email or phone number to sign up
User recieves verification code to their phone number (SMS / WhatsApp)
User enters verification code to complete the onboarding process
User is redirected to the dashboard

Flow B [Property Manager - Upward/GT]:
Property can choose to select email or phone number while inviting the tenant.
Tenant recieves a link via SMS / WhatsApp to complete the onboarding process
User completes the onboarding process
User is redirected to the dashboard
```