import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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

  /** `Form.validate()`: valida los campos visibles y deja los avisos hasta el próximo envío. */
  const validar = (): boolean => {
    const nuevos: ErroresLogin = {
      nombre: vm.esRegistro && campos.nombre.trim().length < 2 ? 'Escribe tu nombre' : null,
      email: !campos.email.includes('@') ? 'Correo inválido' : null,
      password: campos.password.length < 6 ? 'Mínimo 6 caracteres' : null,
    };
    setErrores(nuevos);
    return !nuevos.nombre && !nuevos.email && !nuevos.password;
  };

  const enviar = () =>
    void vm.enviar({ formularioValido: validar(), nombre: campos.nombre, email: campos.email, password: campos.password });

  const formulario = (
    <FormularioLogin
      vm={vm}
      campos={campos}
      errores={errores}
      onCampo={(campo, valor) => setCampos((antes) => ({ ...antes, [campo]: valor }))}
      onEnviar={enviar}
      onUsarCuentaDemo={() => setCampos((antes) => ({ ...antes, email: CORREO_DEMO, password: CLAVE_DEMO }))}
    />
  );

  if (width > AppTheme.bpCompact) {
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
      <ScrollView contentContainerStyle={[AppInsets.pantalla, estilos.centrado]} keyboardShouldPersistTaps="handled">
        {formulario}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  fila: { flex: 1, flexDirection: 'row' },
  mitad: { flex: 1 },
  centrado: { flexGrow: 1, justifyContent: 'center' },
});
