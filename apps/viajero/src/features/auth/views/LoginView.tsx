import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDependencies } from '@/composition';
import { AppInsets, AppTheme, useTheme } from '@/ui/theme';

import { FormularioLogin, type CamposLogin, type ErroresLogin } from '../components/FormularioLogin';
import { PanelMarca } from '../components/PanelMarca';
import { CLAVE_DEMO, CORREO_DEMO, useLoginViewModel } from '../view-models/useLoginViewModel';

/**
 * Acceso del viajero (`/login`): en pantallas anchas (> 640) muestra el panel de marca a la
 * izquierda. El estado vive en `useLoginViewModel` (MVVM); los campos y su validación, aquí.
 *
 * [mostrarCuentaDemo] ofrece «Usar cuenta demo»; por defecto solo en desarrollo (`__DEV__`): en
 * producción la clave de la cuenta de pruebas no debe estar a un toque.
 */
export function LoginView({ mostrarCuentaDemo = __DEV__ }: { mostrarCuentaDemo?: boolean }) {
  const tema = useTheme();
  const { auth } = useDependencies();
  const vm = useLoginViewModel({ auth, cuentaDemo: mostrarCuentaDemo });
  const { width } = useWindowDimensions();
  const [campos, setCampos] = useState<CamposLogin>({ nombre: '', email: '', password: '' });
  const [errores, setErrores] = useState<ErroresLogin>({});
  /**
   * Tras un envío fallido los avisos se recalculan al escribir (`AutovalidateMode.onUserInteraction`
   * después del submit): corregir un campo quita su aviso. Antes del primer envío no se avisa nada.
   */
  const [autovalidar, setAutovalidar] = useState(false);

  /** Cambia los campos y, si ya hubo un envío fallido, revalida con los valores nuevos. */
  const actualizar = (cambios: Partial<CamposLogin>) => {
    const nuevos = { ...campos, ...cambios };
    setCampos(nuevos);
    if (autovalidar) setErrores(validarCampos(nuevos, vm.esRegistro));
  };

  /** `Form.validate()`: valida los campos visibles; si algo falla, pasa a revalidar al escribir. */
  const validar = (): boolean => {
    const nuevos = validarCampos(campos, vm.esRegistro);
    setErrores(nuevos);
    const valido = !nuevos.nombre && !nuevos.email && !nuevos.password;
    if (!valido) setAutovalidar(true);
    return valido;
  };

  const enviar = () =>
    void vm.enviar({ formularioValido: validar(), nombre: campos.nombre, email: campos.email, password: campos.password });

  /** Otro modo, otro formulario: los avisos del intento anterior no aplican. */
  const alternarModo = () => {
    setErrores({});
    setAutovalidar(false);
    vm.alternarModo();
  };

  const ancha = width > AppTheme.bpCompact;
  const formulario = (
    <FormularioLogin
      vm={vm}
      conMarca={!ancha}
      campos={campos}
      errores={errores}
      onCampo={(campo, valor) => actualizar({ [campo]: valor })}
      onEnviar={enviar}
      onAlternarModo={alternarModo}
      onUsarCuentaDemo={() => actualizar({ email: CORREO_DEMO, password: CLAVE_DEMO })}
    />
  );

  if (ancha) {
    return (
      <View style={[estilos.fila, { backgroundColor: tema.fondoPagina }]}>
        <View style={estilos.mitad}>
          <PanelMarca />
        </View>
        <ScrollView style={estilos.mitad} contentContainerStyle={estilos.centrado}>
          {formulario}
        </ScrollView>
      </View>
    );
  }
  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      {/* Ni iOS ni Android (edge-to-edge desde el SDK 58) achican la ventana con el teclado: sin
          esto el teclado taparía «Entrar». `padding` en ambas: con `height` el KAV pierde el flex. */}
      <KeyboardAvoidingView testID="teclado-login" style={estilos.pantalla} behavior="padding">
        <ScrollView
          contentContainerStyle={[AppInsets.pantalla, estilos.centrado]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {formulario}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Avisos de cada campo visible (`validator` de cada `TextFormField`); `null` si está bien. */
function validarCampos(campos: CamposLogin, esRegistro: boolean): ErroresLogin {
  return {
    nombre: esRegistro && campos.nombre.trim().length < 2 ? 'Escribe tu nombre' : null,
    email: !campos.email.includes('@') ? 'Correo inválido' : null,
    password: campos.password.length < 6 ? 'Mínimo 6 caracteres' : null,
  };
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  fila: { flex: 1, flexDirection: 'row' },
  mitad: { flex: 1 },
  centrado: { flexGrow: 1, justifyContent: 'center' },
});
