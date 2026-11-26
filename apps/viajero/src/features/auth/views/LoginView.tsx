import { useFocusEffect } from 'expo-router';
import { useCallback, useEffectEvent, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDependencies } from '@/composition';
import { AppInsets, AppTheme, useTheme } from '@/ui/theme';

import { LoginForm, type LoginFields, type LoginErrors } from '../components/LoginForm';
import { BrandPanel } from '../components/BrandPanel';
import { DEMO_PASSWORD, DEMO_EMAIL, useLoginViewModel } from '../view-models/useLoginViewModel';

/**
 * Acceso del viajero (`/login`): en pantallas anchas (> 640) muestra el panel de marca a la
 * izquierda. El estado vive en `useLoginViewModel` (MVVM); los campos y su validación, aquí.
 *
 * [showDemoAccount] ofrece «Usar cuenta demo»; por defecto solo en desarrollo (`__DEV__`): en
 * producción la clave de la cuenta de pruebas no debe estar a un toque.
 */
export function LoginView({ showDemoAccount = __DEV__ }: { showDemoAccount?: boolean }) {
  const theme = useTheme();
  const { auth } = useDependencies();
  const vm = useLoginViewModel({ auth, demoAccount: showDemoAccount });
  const { width } = useWindowDimensions();
  const [fields, setFields] = useState<LoginFields>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  /**
   * Tras un envío fallido los avisos se recalculan al escribir (`AutovalidateMode.onUserInteraction`
   * después del submit): corregir un campo quita su aviso. Antes del primer envío no se avisa nada.
   */
  const [autoValidate, setAutoValidate] = useState(false);

  /** Cambia los campos y, si ya hubo un envío fallido, revalida con los valores nuevos. */
  const updateFields = (changes: Partial<LoginFields>) => {
    const next = { ...fields, ...changes };
    setFields(next);
    if (autoValidate) setErrors(validateFields(next, vm.isSignUp));
  };

  /** `Form.validate()`: valida los campos visibles; si algo falla, pasa a revalidar al escribir. */
  const validate = (): boolean => {
    const next = validateFields(fields, vm.isSignUp);
    setErrors(next);
    const isValid = !next.name && !next.email && !next.password;
    if (!isValid) setAutoValidate(true);
    return isValid;
  };

  const submit = () =>
    void vm.submit({ isFormValid: validate(), name: fields.name, email: fields.email, password: fields.password });

  /** Otro modo, otro formulario: los avisos del intento anterior no aplican. */
  const toggleMode = () => {
    setErrors({});
    setAutoValidate(false);
    vm.toggleMode();
  };

  // «Crea tu cuenta» es un modo de esta misma pantalla, no otra en la pila: el atrás de Android
  // vuelve a «Entrar» en vez de cerrar la app. En «Entrar» no se toca (el sistema hace lo suyo).
  const backToSignIn = useEffectEvent(toggleMode);
  const { isSignUp } = vm;
  useFocusEffect(
    useCallback(() => {
      if (!isSignUp) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        backToSignIn();
        return true;
      });
      return () => subscription.remove();
    }, [isSignUp]),
  );

  const isWide = width > AppTheme.bpCompact;
  const form = (
    <LoginForm
      vm={vm}
      withBrand={!isWide}
      fields={fields}
      errors={errors}
      onFieldChange={(field, value) => updateFields({ [field]: value })}
      onSubmit={submit}
      onToggleMode={toggleMode}
      onUseDemoAccount={() => updateFields({ email: DEMO_EMAIL, password: DEMO_PASSWORD })}
    />
  );

  if (isWide) {
    return (
      <View style={[styles.row, { backgroundColor: theme.pageBackground }]}>
        <View style={styles.half}>
          <BrandPanel />
        </View>
        <ScrollView style={styles.half} contentContainerStyle={styles.centered}>
          {form}
        </ScrollView>
      </View>
    );
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      {/* Ni iOS ni Android (edge-to-edge desde el SDK 58) achican la ventana con el teclado: sin
          esto el teclado taparía «Entrar». `padding` en ambas: con `height` el KAV pierde el flex. */}
      <KeyboardAvoidingView testID="login-keyboard" style={styles.screen} behavior="padding">
        <ScrollView
          contentContainerStyle={[AppInsets.screen, styles.centered]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {form}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Avisos de cada campo visible (`validator` de cada `TextFormField`); `null` si está bien. */
function validateFields(fields: LoginFields, isSignUp: boolean): LoginErrors {
  return {
    name: isSignUp && fields.name.trim().length < 2 ? 'Escribe tu nombre' : null,
    email: !fields.email.includes('@') ? 'Correo inválido' : null,
    password: fields.password.length < 6 ? 'Mínimo 6 caracteres' : null,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  half: { flex: 1 },
  centered: { flexGrow: 1, justifyContent: 'center' },
});
