import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeIn, Label, Note } from '../components/Bits';
import Button, { CircleButton } from '../components/Button';
import { BackIcon } from '../components/Icons';
import { Colors, fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';

type Errors = { name?: string; email?: string; password?: string };

// Log in / Register with Supabase Auth.
export default function AuthScreen() {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const params = useLocalSearchParams<{ mode?: string }>();
  const [register, setRegister] = useState(params.mode === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState(''); // message from the server
  const [notice, setNotice] = useState(''); // e.g. "check your email"
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();

  async function submit() {
    const next: Errors = {};
    if (register && name.trim().length < 2) next.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    setFormError('');
    setNotice('');
    if (Object.keys(next).length > 0 || busy) return;

    setBusy(true);
    const result = register ? await signUp(name.trim(), email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);

    if (result.error) setFormError(result.error);
    else if (result.needsEmailConfirm) {
      setNotice('Account created. Open the link we emailed you, then log in.');
      setRegister(false);
    } else router.replace('/home');
  }

  function switchMode() {
    setRegister(!register);
    setErrors({});
    setFormError('');
    setNotice('');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <CircleButton label="Back" onPress={() => router.back()}>
            <BackIcon color={c.tx} />
          </CircleButton>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn i={0}>
            <Text style={s.title}>{register ? 'Create your\naccount' : 'Welcome\nback'}</Text>
            <Label style={s.subtitle}>
              {register ? 'Start with a paper-trading balance and build your edge.' : 'Sign in to see your watchlist, setups and journal.'}
            </Label>
          </FadeIn>

          <FadeIn i={1} style={{ gap: 14 }}>
            {register && (
              <Field label="Full name" value={name} onChange={setName} placeholder="Your name" error={errors.name} autoComplete="name" capitalize />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} autoComplete="email" email />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              error={errors.password}
              autoComplete={register ? 'new-password' : 'current-password'}
              secure
            />
            {formError ? <Text style={s.error}>{formError}</Text> : null}
            {notice ? <Text style={s.notice}>{notice}</Text> : null}
            <Button label={busy ? 'Please wait…' : register ? 'Create account' : 'Log in'} onPress={submit} style={{ marginTop: 6 }} />
          </FadeIn>

          <FadeIn i={2}>
            <Pressable onPress={switchMode} style={s.switch} accessibilityRole="button">
              <Text style={s.switchText}>
                {register ? 'Already have an account? ' : 'New here? '}
                <Text style={s.switchLink}>{register ? 'Log in' : 'Create an account'}</Text>
              </Text>
            </Pressable>
          </FadeIn>

          <Note style={{ textAlign: 'center', marginTop: 'auto' }}>
            Educational analysis tool. Not investment advice. No real orders are placed.
          </Note>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  error?: string;
  autoComplete: 'name' | 'email' | 'new-password' | 'current-password';
  secure?: boolean;
  email?: boolean;
  capitalize?: boolean;
};

function Field({ label, value, onChange, placeholder, error, autoComplete, secure, email, capitalize }: FieldProps) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, focused && s.inputFocused, !!error && s.inputBad]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.mu2}
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize={capitalize ? 'words' : 'none'}
        autoCorrect={false}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    header: { height: 60, paddingHorizontal: 18, justifyContent: 'center' },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 22 },
    title: { fontFamily: fonts.headBold, fontSize: 32, lineHeight: 35, letterSpacing: -0.64, color: c.tx },
    subtitle: { fontSize: 14.5, lineHeight: 22, marginTop: 10 },
    fieldLabel: { fontSize: 13, fontFamily: fonts.semi, color: c.tx2 },
    input: {
      height: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.bd2,
      backgroundColor: c.card,
      paddingHorizontal: 16,
      fontSize: 15,
      fontFamily: fonts.regular,
      color: c.tx,
    },
    inputFocused: { borderColor: '#A9AAFF', boxShadow: '0 0 0 4px rgba(90,91,234,0.12)' },
    inputBad: { borderColor: '#F0A3A6', boxShadow: '0 0 0 4px rgba(217,58,64,0.10)' },
    error: { fontSize: 12.5, fontFamily: fonts.medium, color: c.dn },
    notice: { fontSize: 12.5, fontFamily: fonts.medium, color: c.up },
    switch: { height: 44, alignItems: 'center', justifyContent: 'center' },
    switchText: { fontSize: 14, fontFamily: fonts.regular, color: c.mu },
    switchLink: { fontFamily: fonts.bold, color: c.pr },
  });
