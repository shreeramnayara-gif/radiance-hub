import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

interface Props {
  initialHtml: string;
  readOnly?: boolean;
  onChange?: (html: string, text: string) => void;
}

export function ReportEditor({ initialHtml, readOnly, onChange }: Props) {
  const lastEmitted = useRef(initialHtml);
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml || "<p></p>",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[320px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      if (html === lastEmitted.current) return;
      lastEmitted.current = html;
      onChange?.(html, e.getText());
    },
  });

  // Keep editor in sync if parent swaps draft (e.g. after submit/refetch).
  useEffect(() => {
    if (editor && initialHtml && initialHtml !== editor.getHTML()) {
      editor.commands.setContent(initialHtml, false);
      lastEmitted.current = initialHtml;
    }
  }, [initialHtml, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-border bg-background">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 text-sm">
          <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} className="italic">I</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarBtn>
          <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarBtn>
          <div className="ml-auto" />
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarBtn>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ active, onClick, children, className }: { active?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
