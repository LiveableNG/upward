'use client'

import React, { useRef } from 'react'
import { Editor } from '@hugerte/hugerte-react'
import { api } from '@/lib/api'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number | string
  placeholder?: string
  menubar?: boolean
  toolbar?: string
  disabled?: boolean
}

export function RichTextEditor({ 
  value, 
  onChange, 
  height = 500, 
  placeholder = 'Start typing...',
  menubar = true,
  toolbar,
  disabled = false
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null)

  const defaultToolbar = 'undo redo | blocks fontfamily fontsize | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | signatures placeholders | help'

  return (
    <div className="rich-text-editor-container" style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <Editor
        disabled={disabled}
        onInit={(evt, editor) => editorRef.current = editor}
        value={value}
        init={{
          height: '100%',
          menubar,
          placeholder,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
          ],
          toolbar: toolbar || defaultToolbar,
          content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#1e293b; padding: 20px; }',
          setup: (editor: any) => {
            editor.ui.registry.addButton('signatures', {
              text: 'Signatures',
              icon: 'signature',
              onAction: async () => {
                try {
                  const signatures = await api.fetchSignatures()
                  if (!signatures || signatures.length === 0) {
                    editor.windowManager.alert('No signatures found. Please configure them in Settings -> Branding.')
                    return
                  }

                  editor.windowManager.open({
                    title: 'Insert Signature',
                    body: {
                      type: 'panel',
                      items: [
                        {
                          type: 'selectbox',
                          name: 'signatureId',
                          label: 'Select Signature',
                          items: signatures.map((sig: any) => ({
                            text: `${sig.name} (${sig.type})`,
                            value: sig.id.toString()
                          }))
                        }
                      ]
                    },
                    buttons: [
                      {
                        type: 'cancel',
                        text: 'Cancel'
                      },
                      {
                        type: 'submit',
                        text: 'Insert',
                        primary: true
                      }
                    ],
                    onSubmit: (apiInstance: any) => {
                      const data = apiInstance.getData()
                      const selectedSig = signatures.find((s: any) => s.id.toString() === data.signatureId)
                      if (selectedSig) {
                        if (selectedSig.type === 'digital') {
                          editor.insertContent(selectedSig.content)
                        } else {
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                          const absoluteUrl = selectedSig.fileUrl.startsWith('http') ? selectedSig.fileUrl : `${apiUrl}${selectedSig.fileUrl}`;
                          editor.insertContent(`<img src="${absoluteUrl}" alt="${selectedSig.name}" style="max-height: 80px; width: auto;" />`)
                        }
                      }
                      apiInstance.close()
                    }
                  })
                } catch (err) {
                  console.error(err)
                  editor.windowManager.alert('Failed to load signatures.')
                }
              }
            });

            editor.ui.registry.addMenuButton('placeholders', {
              text: 'Placeholders',
              fetch: (callback: any) => {
                const placeholdersMap = {
                  'Tenant Information': {
                    'TenantName': 'Full name of the tenant',
                    'TenantFirstName': 'First name of the tenant',
                    'TenantLastName': 'Last name of the tenant',
                    'TenantEmail': 'Email address of the tenant',
                    'TenantPhone': 'Phone number of the tenant',
                    'TenantAddress': 'Current address of the tenant',
                  },
                  'Property Information': {
                    'UnitName': 'Name of the unit',
                    'UnitNumber': 'Unit number',
                    'PropertyName': 'Name of the property',
                    'PropertyAddress': 'Full address of the property',
                    'PropertyType': 'Type of property (e.g., Apartment, House)',
                    'Bedrooms': 'Number of bedrooms',
                    'Bathrooms': 'Number of bathrooms',
                  },
                  'Rent Information': {
                    'RentStartDate': 'Start date of the rent',
                    'RentEndDate': 'End date of the rent',
                    'RentType': 'Type of rent (e.g., Monthly, Quarterly, Yearly)',
                    'RentDuration': 'Duration of the rent',
                    'RentAmount': 'Monthly rent amount',
                    'ServiceCharge': 'Monthly service charge',
                  },
                  'Company Information': {
                    'CompanyName': 'Name of the property management company',
                    'CompanyAddress': 'Address of the company',
                    'CompanyPhone': 'Phone number of the company',
                    'CompanyEmail': 'Email address of the company',
                    'ManagerName': 'Name of the property manager',
                    'ManagerPhone': 'Phone number of the property manager',
                    'ManagerEmail': 'Email address of the property manager',
                  },
                  'Date Information': {
                    'CurrentDate': 'Current date',
                    'CurrentMonth': 'Current month name',
                    'CurrentYear': 'Current year',
                    'NextMonth': 'Next month name',
                    'PreviousMonth': 'Previous month name',
                  },
                  'Financial Information': {
                    'OutstandingBalance': 'Outstanding balance owed by tenant',
                    'LastPaymentDate': 'Date of last payment',
                    'LastPaymentAmount': 'Amount of last payment',
                  },
                  'Payment Info': {
                    'PaymentURL': 'Payment link URL',
                    'BankDetails': 'Virtual bank account details',
                    'PaymentInfo': 'All payment instructions',
                  }
                };

                const items: any[] = [];
                Object.entries(placeholdersMap).forEach(([category, categoryPlaceholders]) => {
                  const categoryItems = Object.entries(categoryPlaceholders).map(([placeholder, description]) => ({
                    type: 'menuitem',
                    text: `${placeholder} — ${description}`,
                    onAction: () => {
                      editor.insertContent(`[${placeholder}]`);
                    }
                  }));

                  items.push({
                    type: 'nestedmenuitem',
                    text: category,
                    getSubmenuItems: () => categoryItems,
                  });
                });

                callback(items as any);
              }
            });
          },
          branding: false,
          promotion: false,
          skin: 'oxide',
          content_css: 'default'
        }}
        onEditorChange={onChange}
      />
    </div>
  )
}
