import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { InlineNotice } from '../components/InlineNotice';
import { TopBar } from '../components/TopBar';
import type { RootStackParamList } from '../navigation/types';
import { sendChatMessageDetailed, type ChatTurn } from '../services/api';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface Message extends ChatTurn {
  id: string;
  source: 'api' | 'local';
}

const QUICK_QUESTIONS = [
  'What visual evidence supports this?',
  'Explain the safety warnings',
  'Where did the nutrition values come from?',
];

export function ChatScreen({ navigation, route }: Props): React.JSX.Element {
  const { result } = route.params;
  const listRef = useRef<FlatList<Message> | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ask about the evidence, uncertainty, safety notes, or nutrition provenance for ${result.identification.name}. I will stay grounded in this discovery.`,
      source: 'local',
    },
  ]);

  const safetySummary = useMemo(
    () => `${result.safety.headline}. ${result.safety.warnings.join(' ')}`,
    [result.safety.headline, result.safety.warnings],
  );

  const submit = async (rawQuestion: string, appendUser = true): Promise<void> => {
    const question = rawQuestion.trim();
    if (!question || loading) return;
    setLoading(true);
    setInput('');
    setLiveError(null);
    setSafetyNotice(null);
    setLastQuestion(question);

    const history: ChatTurn[] = messages.map(({ role, content }) => ({ role, content }));
    if (appendUser) {
      setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: question, source: 'local' }]);
    }

    try {
      const reply = await sendChatMessageDetailed(result, question, history);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: reply.message, source: reply.source },
      ]);
      setSafetyNotice(reply.safetyNotice);
      setLiveError(reply.liveError ?? null);
    } catch (caught) {
      setLiveError(caught instanceof Error ? caught.message : 'The question could not be sent. Please retry.');
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TopBar title={`Ask about ${result.identification.name}`} onBack={() => navigation.goBack()} />
          <View accessibilityRole="alert" style={styles.safetyStrip}>
            <View style={styles.safetyMarker} />
            <View style={styles.safetyCopy}>
              <Text style={styles.safetyLabel}>SCAN SAFETY CONTEXT</Text>
              <Text numberOfLines={3} style={styles.safetyText}>{safetySummary}</Text>
            </View>
          </View>
          <Text style={styles.boundary}>Answers can explain this scan, but cannot verify edibility, diagnose, treat, or replace professional guidance.</Text>
        </View>

        <FlatList
          ref={listRef}
          accessibilityLabel="Conversation about this discovery"
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.messageWrap, item.role === 'user' ? styles.userWrap : styles.assistantWrap]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                {item.role === 'assistant' ? (
                  <View style={styles.messageMeta}>
                    <Text style={styles.messageRole}>ECOLENS</Text>
                    {item.id !== 'welcome' && item.source === 'local' ? <Badge label="Saved scan" tone="neutral" /> : null}
                  </View>
                ) : null}
                <Text style={[styles.messageText, item.role === 'user' && styles.userText]}>{item.content}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={(
            <View>
              {loading ? (
                <View accessibilityRole="progressbar" accessibilityLabel="EcoLens is preparing an answer" style={styles.thinking}>
                  <View style={styles.thinkingDot} />
                  <View style={styles.thinkingDot} />
                  <View style={styles.thinkingDot} />
                  <Text style={styles.thinkingText}>Checking the saved evidence…</Text>
                </View>
              ) : null}
              {safetyNotice ? <InlineNotice title="Safety response" body={safetyNotice} tone="error" /> : null}
              {liveError ? (
                <View style={styles.retryBox}>
                  <InlineNotice title="Live assistant unavailable" body={liveError} />
                  {lastQuestion ? (
                    <AppButton label="Retry live answer" variant="secondary" compact onPress={() => void submit(lastQuestion, false)} />
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        />

        <View style={styles.composerArea}>
          {messages.length <= 1 ? (
            <View style={styles.quickList}>
              {QUICK_QUESTIONS.map((question) => (
                <Pressable
                  key={question}
                  accessibilityRole="button"
                  accessibilityLabel={question}
                  disabled={loading}
                  onPress={() => void submit(question)}
                  style={({ pressed }) => [styles.quickQuestion, { opacity: pressed || loading ? 0.58 : 1 }]}
                >
                  <Text style={styles.quickText}>{question}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Question about this discovery"
              accessibilityHint="Ask about evidence, safety, or nutrition provenance"
              editable={!loading && result.chat_available}
              multiline
              maxLength={1000}
              placeholder={result.chat_available ? 'Ask a grounded follow-up…' : 'Chat is unavailable for this scan'}
              placeholderTextColor={colors.inkMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => void submit(input)}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send question"
              accessibilityState={{ disabled: loading || !input.trim() || !result.chat_available }}
              disabled={loading || !input.trim() || !result.chat_available}
              onPress={() => void submit(input)}
              style={({ pressed }) => [styles.send, { opacity: loading || !input.trim() || !result.chat_available ? 0.4 : pressed ? 0.72 : 1 }]}
            >
              <Text style={styles.sendText}>↑</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg },
  safetyStrip: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.amberPale, borderRadius: radii.md, padding: spacing.sm },
  safetyMarker: { width: 7, borderRadius: radii.pill, backgroundColor: colors.amber },
  safetyCopy: { flex: 1 },
  safetyLabel: { ...type.label, color: colors.amber, fontSize: 9 },
  safetyText: { ...type.small, color: colors.ink, marginTop: 2 },
  boundary: { ...type.small, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.sm },
  messages: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  messageWrap: { marginBottom: spacing.md, flexDirection: 'row' },
  userWrap: { justifyContent: 'flex-end' },
  assistantWrap: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: radii.lg, padding: spacing.md },
  userBubble: { backgroundColor: colors.forest, borderBottomRightRadius: radii.sm },
  assistantBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: radii.sm },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  messageRole: { ...type.label, color: colors.moss, fontSize: 9 },
  messageText: { ...type.body, color: colors.ink },
  userText: { color: colors.white },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cream, alignSelf: 'flex-start', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  thinkingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.moss },
  thinkingText: { ...type.small, color: colors.inkMuted, marginLeft: spacing.xs },
  retryBox: { marginBottom: spacing.md },
  composerArea: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  quickList: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.sm },
  quickQuestion: { flex: 1, borderRadius: radii.md, backgroundColor: colors.cream, padding: spacing.xs, justifyContent: 'center' },
  quickText: { ...type.small, color: colors.forest, textAlign: 'center', fontSize: 11 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: 50, maxHeight: 112, borderRadius: radii.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...type.body, color: colors.ink },
  send: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.white, fontSize: 28, lineHeight: 30, fontWeight: '700' },
});
