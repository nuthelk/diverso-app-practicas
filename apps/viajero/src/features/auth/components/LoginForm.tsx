import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';
import { ButtonSpinner } from '@/features/shell/components/ButtonSpinner';
import { AppRoutes } from '@/router';
import { FilledButton, Icon, IconButton, OutlinedButton, Text, TextButton, TextField } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

import type { LoginViewModel } from '../view-models/useLoginViewModel';
import { WelcomeHummingbird } from './WelcomeHummingbird';

export interface LoginFields {
  name: string;
  email: string;
  password: string;
}

export interface LoginErrors {
  name?: string | null;
  email?: string | null;
  password?: string | null;
}

/**
 * Formulario de acceso (entrar o crear cuenta). Los campos y sus avisos son de la pantalla
 * (sobreviven al cambio de diseño ancho/angosto); lo demás sale del view model.
 *
 * [withBrand]: en pantallas angostas el formulario abre con la marca: solo el colibrí, grande,
 * centrado y sin caja ni nombre. En anchas vive en el panel de la izquierda y aquí no se repite.
 */
export function LoginForm({
  vm,
  fields,
  errors,
  withBrand,
  onFieldChange,
  onSubmit,
  onToggleMode,
  onUseDemoAccount,
}: {
  vm: LoginViewModel;
  fields: LoginFields;
  errors: LoginErrors;
  withBrand: boolean;
  onFieldChange: (field: keyof LoginFields, value: string) => void;
  onSubmit: () => void;
  /** Cambia entre entrar y crear cuenta (la pantalla limpia además los avisos de los campos). */
  onToggleMode: () => void;
  onUseDemoAccount: () => void;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const footerText = { fontSize: AppText.largeCaption, fontWeight: '600' as const, color: cs.onSurfaceVariant };

  return (
    <View style={styles.form}>
      {withBrand ? (
        <View testID="login-brand" style={styles.brand}>
          <WelcomeHummingbird size={112} color={cs.primary} />
        </View>
      ) : null}
      {/* Entrar: solo el colibrí y la frase, centrada bajo él. Crear cuenta sí lleva título: es lo
          que marca el cambio de modo. */}
      {vm.isSignUp ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            Crea tu cuenta
          </Text>
          <View style={{ height: 8 }} />
        </>
      ) : null}
      <Text
        style={[
          { fontSize: AppText.largeBody, color: cs.onSurfaceVariant },
          vm.isSignUp ? null : styles.centeredTagline,
        ]}
      >
        {vm.isSignUp ? 'Explora y reserva planes de agencias verificadas.' : 'Entra para seguir explorando Antioquia.'}
      </Text>
      <View style={{ height: 28 }} />
      {vm.isSignUp ? (
        <>
          <TextField
            label="Tu nombre"
            icon="person_outline_rounded"
            value={fields.name}
            onChangeText={(v) => onFieldChange('name', v)}
            error={errors.name}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <View style={styles.fieldGap} />
        </>
      ) : null}
      <TextField
        label="Correo"
        icon="mail_outline_rounded"
        value={fields.email}
        onChangeText={(v) => onFieldChange('email', v)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        onSubmitEditing={onSubmit}
      />
      <View style={styles.fieldGap} />
      <TextField
        label="Contraseña"
        icon="lock_outline_rounded"
        value={fields.password}
        onChangeText={(v) => onFieldChange('password', v)}
        error={errors.password}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete={vm.isSignUp ? 'new-password' : 'current-password'}
        textContentType={vm.isSignUp ? 'newPassword' : 'password'}
        onSubmitEditing={onSubmit}
        suffix={
          <IconButton
            icon={showPassword ? 'visibility_off_outlined' : 'visibility_outlined'}
            tooltip={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            iconColor={cs.onSurfaceVariant}
            iconSize={22}
            onPress={() => setShowPassword((prev) => !prev)}
          />
        }
      />
      {vm.isSignUp ? (
        <>
          <View style={{ height: 16 }} />
          <ConsentCheckboxes
            acceptsDataPolicy={vm.acceptsDataPolicy}
            acceptsTerms={vm.acceptsTerms}
            showError={vm.signUpAttempted}
            onDataPolicyChange={vm.setAcceptsDataPolicy}
            onTermsChange={vm.setAcceptsTerms}
          />
        </>
      ) : null}
      {vm.error !== null ? (
        <View accessibilityRole="alert" style={[styles.errorBox, { backgroundColor: cs.errorContainer }]}>
          <Icon name="error_outline_rounded" size={20} color={cs.onErrorContainer} />
          <Text style={{ flex: 1, color: cs.onErrorContainer, fontSize: AppText.smallBody }}>{vm.error}</Text>
        </View>
      ) : null}
      <View style={{ height: 24 }} />
      <FilledButton
        accessibilityLabel={vm.isSignUp ? 'Crear cuenta' : 'Entrar'}
        onPress={vm.loading ? null : onSubmit}
        style={styles.primary}
      >
        {vm.loading ? <ButtonSpinner /> : <Text>{vm.isSignUp ? 'Crear cuenta' : 'Entrar'}</Text>}
      </FilledButton>
      <View style={{ height: 10 }} />
      <TextButton
        text={vm.isSignUp ? 'Ya tengo cuenta — entrar' : 'Crear cuenta nueva'}
        onPress={onToggleMode}
        style={styles.centered}
      />
      {vm.offersDemoAccount ? (
        <>
          <View style={{ height: 12 }} />
          <OutlinedButton accessibilityLabel="Usar cuenta demo" onPress={onUseDemoAccount} style={styles.demo}>
            <Icon name="science_outlined" size={18} color={cs.onSurfaceVariant} />
            <Text style={{ color: cs.onSurfaceVariant }}>Usar cuenta demo</Text>
          </OutlinedButton>
        </>
      ) : null}
      <View style={{ height: 28 }} />
      <View style={styles.footer}>
        <TextButton accessibilityLabel="Política de datos" onPress={() => router.push(AppRoutes.legal('privacidad') as Href)}>
          <Text style={footerText}>Política de datos</Text>
        </TextButton>
        <TextButton
          accessibilityLabel="Términos y condiciones"
          onPress={() => router.push(AppRoutes.legal('terminos-viajeros') as Href)}
        >
          <Text style={footerText}>Términos y condiciones</Text>
        </TextButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: '100%', maxWidth: 420, paddingHorizontal: 24, alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: AppText.pageTitle, fontWeight: '800', letterSpacing: -0.8 },
  centeredTagline: { textAlign: 'center' },
  fieldGap: { height: 14 },
  errorBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  primary: { minHeight: 56 },
  centered: { alignSelf: 'center' },
  demo: { minHeight: 44, alignSelf: 'center', paddingHorizontal: 18 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
