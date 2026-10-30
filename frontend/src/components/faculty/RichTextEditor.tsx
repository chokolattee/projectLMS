import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const commands = [
  { label: 'B', command: 'bold', title: 'Bold selected text' },
  { label: 'I', command: 'italic', title: 'Italic selected text' },
];

export function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || '';
      initialized.current = true;
    }
  }, [value]);

  if (Platform.OS !== 'web') {
    return (
      <TextInput
        style={[styles.nativeEditor, { minHeight }]}
        multiline
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        textAlignVertical="top"
      />
    );
  }

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selectionRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        {commands.map(item => (
          <Pressable
            key={item.label}
            accessibilityLabel={item.title}
            accessibilityHint={item.title}
            style={styles.toolButton}
            onPress={() => runCommand(item.command)}
          >
            <Text style={[styles.toolText, item.command === 'bold' && styles.bold, item.command === 'italic' && styles.italic]}>{item.label}</Text>
          </Pressable>
        ))}
        <select
          title="Text style"
          defaultValue="p"
          style={styles.selectInput as any}
          onChange={(event: any) => runCommand('formatBlock', event.target.value)}
        >
          <option value="p">Body</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          title="Font family"
          defaultValue="Arial"
          style={styles.selectInput as any}
          onChange={(event: any) => runCommand('fontName', event.target.value)}
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select
          title="Font size"
          defaultValue="3"
          style={styles.selectInput as any}
          onChange={(event: any) => runCommand('fontSize', event.target.value)}
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
        <Pressable style={styles.toolButton} onPress={() => runCommand('insertUnorderedList')}>
          <Text style={styles.toolText}>• List</Text>
        </Pressable>
        <Pressable style={styles.toolButton} onPress={() => runCommand('insertOrderedList')}>
          <Text style={styles.toolText}>1. List</Text>
        </Pressable>
        <input
          type="color"
          title="Text color"
          style={styles.colorInput as any}
          onChange={(event: any) => runCommand('foreColor', event.target.value)}
        />
      </View>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event: any) => onChange(event.currentTarget.innerHTML)}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        style={{ ...webEditorStyle, minHeight }}
      />
    </View>
  );
}

const webEditorStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: 12,
  color: COLORS.text,
  backgroundColor: '#FCFCFC',
  outline: 'none',
  lineHeight: 1.55,
  fontFamily: 'Arial, sans-serif',
  fontSize: 14,
  whiteSpace: 'pre-wrap',
  overflowY: 'auto',
};

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  toolbar: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', backgroundColor: '#F8F9FA', padding: 6, borderWidth: 1, borderColor: '#EAECEF', borderRadius: 6, marginBottom: 8 },
  toolButton: { backgroundColor: COLORS.white, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  toolText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  bold: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },
  colorInput: { width: 32, height: 28, padding: 0, borderWidth: 0 },
  selectInput: { height: 28, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, backgroundColor: COLORS.white, color: COLORS.text, fontSize: 11 },
  nativeEditor: { backgroundColor: '#FCFCFC', borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, padding: 12, fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
