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
    'lineSpacing | removeformat | signatures placeholders | help'

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
          // Matches exactly how emails are rendered: same font, size and base line-height
          content_style: [
            "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
            "body {",
            "  font-family: 'Inter', Helvetica, Arial, sans-serif;",
            "  font-size: 15px;",
            "  line-height: 1.6;",
            "  color: #1e293b;",
            "  padding: 20px;",
            "  max-width: 800px;",
            "  margin: 0 auto;",
            "}",
            "p { margin: 0 0 0.75em 0; }",
          ].join(' '),
          setup: (editor: any) => {
            // ─── Line Spacing Button ────────────────────────────────────────
            editor.ui.registry.addMenuButton('lineSpacing', {
              text: 'Line Spacing',
              icon: 'line-height',
              fetch: (callback: any) => {
                const options = [
                  { label: '1.0 — Tight',    value: '1.0' },
                  { label: '1.2 — Compact',  value: '1.2' },
                  { label: '1.4 — Snug',     value: '1.4' },
                  { label: '1.6 — Normal',   value: '1.6' },
                  { label: '1.8 — Relaxed',  value: '1.8' },
                  { label: '2.0 — Double',   value: '2.0' },
                  { label: '2.5 — Airy',     value: '2.5' },
                  { label: '3.0 — Spacious', value: '3.0' },
                ]
                callback(
                  options.map((opt) => ({
                    type: 'menuitem',
                    text: opt.label,
                    onAction: () => {
                      // Apply line-height to every selected block
                      editor.execCommand('mceToggleFormat', false, 'p')
                      const selectedNode = editor.selection.getNode()
                      const blocks: HTMLElement[] = []

                      // Walk up to a block-level element
                      const getBlock = (node: any): HTMLElement | null => {
                        while (node && node !== editor.getBody()) {
                          if (['P','DIV','H1','H2','H3','H4','H5','H6','LI'].includes(node.nodeName)) return node
                          node = node.parentNode
                        }
                        return null
                      }

                      // Collect all blocks within the selection
                      const range = editor.selection.getRng()
                      const walker = editor.dom.createRng()
                      walker.setStart(range.startContainer, range.startOffset)
                      walker.setEnd(range.endContainer, range.endOffset)

                      // Fallback: apply to current node and its parent block
                      const block = getBlock(selectedNode)
                      if (block) blocks.push(block)
                      if (!blocks.length) blocks.push(selectedNode as HTMLElement)

                      blocks.forEach((el) => {
                        el.style.lineHeight = opt.value
                      })

                      editor.nodeChanged()
                    }
                  }))
                )
              }
            })

            // ─── Signatures Button ──────────────────────────────────────────
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
                          let absoluteUrl = selectedSig.fileUrl;
                          if (!absoluteUrl.startsWith('http')) {
                            const base = apiUrl.replace(/\/api\/v1\/?$/, '');
                            absoluteUrl = `${base}${selectedSig.fileUrl}`;
                          }
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
