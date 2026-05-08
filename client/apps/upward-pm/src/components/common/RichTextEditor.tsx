'use client'

import React, { useRef } from 'react'
import { Editor } from '@hugerte/hugerte-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number | string
  placeholder?: string
  menubar?: boolean
  toolbar?: string
}

export function RichTextEditor({ 
  value, 
  onChange, 
  height = 500, 
  placeholder = 'Start typing...',
  menubar = true,
  toolbar
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null)

  const defaultToolbar = 'undo redo | blocks fontfamily fontsize | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | signatures placeholders | help'

  return (
    <div className="rich-text-editor-container" style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <Editor
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
              onAction: () => {
                editor.insertContent('<strong>[SIGNATURE_PLACEHOLDER]</strong>');
              }
            });

            editor.ui.registry.addMenuButton('placeholders', {
              text: 'Placeholders',
              fetch: (callback: any) => {
                const items = [
                  { type: 'menuitem', text: 'Tenant First Name', onAction: () => editor.insertContent('[TenantFirstName]') },
                  { type: 'menuitem', text: 'Tenant Last Name', onAction: () => editor.insertContent('[TenantLastName]') },
                  { type: 'menuitem', text: 'Tenant Phone', onAction: () => editor.insertContent('[TenantPhone]') },
                  { type: 'menuitem', text: 'Unit Name', onAction: () => editor.insertContent('[UnitName]') },
                  { type: 'menuitem', text: 'Rent Amount', onAction: () => editor.insertContent('[RentAmount]') },
                  { type: 'menuitem', text: 'Property Name', onAction: () => editor.insertContent('[PropertyName]') },
                  { type: 'menuitem', text: 'Rent Start Date', onAction: () => editor.insertContent('[RentStartDate]') },
                  { type: 'menuitem', text: 'Rent End Date', onAction: () => editor.insertContent('[RentEndDate]') },
                  { type: 'menuitem', text: 'Manager Name', onAction: () => editor.insertContent('[ManagerName]') },
                  { type: 'menuitem', text: 'Today\'s Date', onAction: () => editor.insertContent('[Date]') }
                ];
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
