'use client'

import { Editor } from '@tinymce/tinymce-react'
import { useRef, useState } from 'react'
import type { Editor as TinyMceEditor } from 'tinymce'

import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/models/dom'
import 'tinymce/themes/silver'
import 'tinymce/plugins/accordion'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/autoresize'
import 'tinymce/plugins/autosave'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/code'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/directionality'
import 'tinymce/plugins/emoticons'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/help'
import 'tinymce/plugins/image'
import 'tinymce/plugins/importcss'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/media'
import 'tinymce/plugins/nonbreaking'
import 'tinymce/plugins/pagebreak'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/quickbars'
import 'tinymce/plugins/save'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/table'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/visualchars'
import 'tinymce/plugins/wordcount'

import { uploadMediaImage } from '../media/media-upload-api'

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
  const [initialEditorValue] = useState(() => initialValue)

  return (
    <div className={invalid ? 'ring-2 ring-destructive/40' : ''}>
      <Editor
        initialValue={initialEditorValue}
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
          automatic_uploads: true,
          autoresize_bottom_margin: 32,
          autoresize_overflow_padding: 0,
          content_css: false,
          content_style:
            'html,body{background-color:#ffffff;background-image:linear-gradient(rgba(42,108,99,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(42,108,99,.08) 1px,transparent 1px),linear-gradient(rgba(42,108,99,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(42,108,99,.035) 1px,transparent 1px);background-size:24px 24px,24px 24px,6px 6px,6px 6px} body{font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.75;margin:0;padding:16px 22px;color:#172421} img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%} td,th{border:1px solid #d7e4e1;padding:8px}',
          image_caption: true,
          images_upload_handler: (blobInfo, progress) =>
            uploadMediaImage(blobInfo.blob(), blobInfo.filename(), progress),
          max_height: 0,
          menubar: 'file edit view insert format tools table help',
          min_height: 480,
          paste_data_images: true,
          plugins:
            'accordion advlist anchor autolink autoresize autosave charmap code codesample directionality emoticons fullscreen help image importcss insertdatetime link lists media nonbreaking pagebreak preview quickbars save searchreplace table visualblocks visualchars wordcount',
          promotion: false,
          skin: false,
          toolbar:
            'undo redo save | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent blockquote | searchreplace visualblocks visualchars | anchor link image media table | accordion pagebreak nonbreaking insertdatetime charmap emoticons codesample | ltr rtl | preview code fullscreen help',
          toolbar_mode: 'floating',
          toolbar_sticky: true,
          toolbar_sticky_offset: 76,
        }}
      />
    </div>
  )
}
