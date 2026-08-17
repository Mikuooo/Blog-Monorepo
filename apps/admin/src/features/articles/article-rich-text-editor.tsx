'use client'

import { Editor } from '@tinymce/tinymce-react'
import { useRef } from 'react'
import type { Editor as TinyMceEditor } from 'tinymce'

import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/models/dom'
import 'tinymce/themes/silver'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/code'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/image'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/table'
import 'tinymce/plugins/wordcount'

export function ArticleRichTextEditor({
  initialValue,
  invalid,
  onBlur,
  onChange,
}: {
  initialValue: string
  invalid?: boolean
  onBlur: () => void
  onChange: (html: string) => void
}) {
  const editorRef = useRef<TinyMceEditor | null>(null)

  return (
    <div className={invalid ? 'rounded-xl ring-2 ring-destructive/40' : ''}>
      <Editor
        initialValue={initialValue}
        licenseKey="gpl"
        onBlur={() => {
          if (editorRef.current) onChange(editorRef.current.getContent())
          onBlur()
        }}
        onEditorChange={onChange}
        onInit={(_event, editor) => {
          editorRef.current = editor
        }}
        init={{
          branding: false,
          automatic_uploads: false,
          content_css: false,
          content_style:
            'body{font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.75;padding:16px 22px;color:#172421} img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%} td,th{border:1px solid #d7e4e1;padding:8px}',
          height: 620,
          image_caption: true,
          menubar: false,
          paste_data_images: false,
          plugins:
            'advlist autolink code codesample fullscreen image link lists preview table wordcount',
          promotion: false,
          skin: false,
          toolbar:
            'undo redo | blocks | bold italic underline strikethrough | bullist numlist blockquote | link image table codesample | alignleft aligncenter alignright | preview code fullscreen',
        }}
      />
    </div>
  )
}
