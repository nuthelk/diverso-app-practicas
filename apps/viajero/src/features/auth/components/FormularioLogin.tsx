import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';
import { GiradorDeBoton } from '@/features/shell/components/GiradorDeBoton';
import { AppRoutes } from '@/router';
import { DiversoLogo, FilledButton, Icono, OutlinedButton, Text, TextButton, TextField } from '@/ui/components';
import { AppInsets, AppText, useTheme } from '@/ui/theme';

import type { LoginViewModel } from '../view-models/useLoginViewModel';

export interface CamposLogin {
  nombre: string;
  email: string;
  password: string;
}

export interface ErroresLogin {
  nombre?: string | null;
  email?: string | null;
  password?: string | null;
}

/**
 * Formulario de acceso (entrar o crear cuenta). Los campos y sus avisos son de la pantalla
 * (sobreviven al cambio de diseño ancho/angosto); lo demás sale del view model.
 */
export function FormularioLogin({
  vm,
  campos,
  errores,
  onCampo,
  onEnviar,
  onUsarCuentaDemo,
}: {
  vm: LoginViewModel;
  campos: CamposLogin;
  errores: ErroresLogin;
  onCampo: (campo: keyof CamposLogin, valor: string) => void;
  onEnviar: () => void;
  onUsarCuentaDemo: () => void;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  const pie = { fontSize: AppText.leyendaGrande, fontWeight: '600' as const, color: cs.onSurfaceVariant };

  return (
    <View style={estilos.formulario}>
      {/* Marca compacta. En Flutter la decide un LayoutBuilder DENTRO del formulario (máx. 400 de
          ancho, siempre < 640): por eso se ve también junto al panel de marca. */}
      <View style={[AppInsets.tarjetaAmplia, estilos.marca, { backgroundColor: cs.primaryContainer }]}>
        <DiversoLogo size={42} color={cs.onPrimaryContainer} />
      </View>
      <View style={{ height: 14 }} />
      <Text style={{ fontSize: AppText.encabezado3xl, fontWeight: '800', letterSpacing: -0.8 }}>
        {vm.esRegistro ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
      </Text>
      <View style={{ height: 6 }} />
      <Text style={{ fontSize: AppText.cuerpo, color: cs.onSurfaceVariant }}>
        {vm.esRegistro ? 'Explora y reserva planes de agencias verificadas.' : 'Entra para seguir explorando Antioquia.'}
      </Text>
      <View style={{ height: 26 }} />
      {vm.esRegistro ? (
        <>
          <TextField
            etiqueta="Tu nombre"
            icono="person_outline_rounded"
            valor={campos.nombre}
            onChangeText={(v) => onCampo('nombre', v)}
            error={errores.nombre}
            autoCapitalize="words"
          />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      <TextField
        etiqueta="Correo"
        icono="mail_outline_rounded"
        valor={campos.email}
        onChangeText={(v) => onCampo('email', v)}
        error={errores.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={onEnviar}
      />
      <View style={{ height: 12 }} />
      <TextField
        etiqueta="Contraseña"
        icono="lock_outline_rounded"
        valor={campos.password}
        onChangeText={(v) => onCampo('password', v)}
        error={errores.password}
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={onEnviar}
      />
      {vm.esRegistro ? (
        <>
          <View style={{ height: 14 }} />
          <ConsentCheckboxes
            aceptaDatos={vm.aceptaDatos}
            aceptaTerminos={vm.aceptaTerminos}
            mostrarError={vm.intentoRegistro}
            onDatos={vm.cambiarAceptaDatos}
            onTerminos={vm.cambiarAceptaTerminos}
          />
        </>
      ) : null}
      {vm.error !== null ? (
        <>
          <View style={{ height: 14 }} />
          <Text style={{ textAlign: 'center', color: cs.error, fontSize: AppText.cuerpoChico }}>{vm.error}</Text>
        </>
      ) : null}
      <View style={{ height: 22 }} />
      <FilledButton
        accessibilityLabel={vm.esRegistro ? 'Crear cuenta' : 'Entrar'}
        onPress={vm.cargando ? null : onEnviar}
      >
        {vm.cargando ? <GiradorDeBoton /> : <Text>{vm.esRegistro ? 'Crear cuenta' : 'Entrar'}</Text>}
      </FilledButton>
      <View style={{ height: 8 }} />
      <TextButton
        texto={vm.esRegistro ? 'Ya tengo cuenta — entrar' : 'Crear cuenta nueva'}
        onPress={vm.alternarModo}
      />
      {vm.ofreceCuentaDemo ? (
        <>
          <View style={{ height: 16 }} />
          <OutlinedButton
            accessibilityLabel="Usar cuenta demo"
            onPress={onUsarCuentaDemo}
            style={estilos.demo}
          >
            <Icono nombre="science_outlined" size={18} color={cs.onSurface} />
            <Text style={{ color: cs.onSurface }}>Usar cuenta demo</Text>
          </OutlinedButton>
        </>
      ) : null}
      <View style={{ height: 18 }} />
      <View style={estilos.pie}>
        <TextButton accessibilityLabel="Política de datos" onPress={() => router.push(AppRoutes.legal('privacidad') as Href)}>
          <Text style={pie}>Política de datos</Text>
        </TextButton>
        <TextButton
          accessibilityLabel="Términos y condiciones"
          onPress={() => router.push(AppRoutes.legal('terminos-viajeros') as Href)}
        >
          <Text style={pie}>Términos y condiciones</Text>
        </TextButton>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { width: '100%', maxWidth: 400, paddingHorizontal: 24, alignSelf: 'center' },
  marca: { borderRadius: 20, alignItems: 'center' },
  demo: { minHeight: 46, paddingLeft: 16 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
