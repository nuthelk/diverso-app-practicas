import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';
import { GiradorDeBoton } from '@/features/shell/components/GiradorDeBoton';
import { AppRoutes } from '@/router';
import { FilledButton, Icono, IconButton, OutlinedButton, Text, TextButton, TextField } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

import type { LoginViewModel } from '../view-models/useLoginViewModel';
import { ColibriDeBienvenida } from './ColibriDeBienvenida';

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
 *
 * [conMarca]: en pantallas angostas el formulario abre con la marca: solo el colibrí, grande,
 * centrado y sin caja ni nombre. En anchas vive en el panel de la izquierda y aquí no se repite.
 */
export function FormularioLogin({
  vm,
  campos,
  errores,
  conMarca,
  onCampo,
  onEnviar,
  onAlternarModo,
  onUsarCuentaDemo,
}: {
  vm: LoginViewModel;
  campos: CamposLogin;
  errores: ErroresLogin;
  conMarca: boolean;
  onCampo: (campo: keyof CamposLogin, valor: string) => void;
  onEnviar: () => void;
  /** Cambia entre entrar y crear cuenta (la pantalla limpia además los avisos de los campos). */
  onAlternarModo: () => void;
  onUsarCuentaDemo: () => void;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  const [verClave, setVerClave] = useState(false);
  const pie = { fontSize: AppText.leyendaGrande, fontWeight: '600' as const, color: cs.onSurfaceVariant };

  return (
    <View style={estilos.formulario}>
      {conMarca ? (
        <View testID="marca-login" style={estilos.marca}>
          <ColibriDeBienvenida size={112} color={cs.primary} />
        </View>
      ) : null}
      {/* Entrar: solo el colibrí y la frase, centrada bajo él. Crear cuenta sí lleva título: es lo
          que marca el cambio de modo. */}
      {vm.esRegistro ? (
        <>
          <Text accessibilityRole="header" style={estilos.titulo}>
            Crea tu cuenta
          </Text>
          <View style={{ height: 8 }} />
        </>
      ) : null}
      <Text
        style={[
          { fontSize: AppText.cuerpoGrande, color: cs.onSurfaceVariant },
          vm.esRegistro ? null : estilos.fraseCentrada,
        ]}
      >
        {vm.esRegistro ? 'Explora y reserva planes de agencias verificadas.' : 'Entra para seguir explorando Antioquia.'}
      </Text>
      <View style={{ height: 28 }} />
      {vm.esRegistro ? (
        <>
          <TextField
            etiqueta="Tu nombre"
            icono="person_outline_rounded"
            valor={campos.nombre}
            onChangeText={(v) => onCampo('nombre', v)}
            error={errores.nombre}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <View style={estilos.entreCampos} />
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
        textContentType="emailAddress"
        onSubmitEditing={onEnviar}
      />
      <View style={estilos.entreCampos} />
      <TextField
        etiqueta="Contraseña"
        icono="lock_outline_rounded"
        valor={campos.password}
        onChangeText={(v) => onCampo('password', v)}
        error={errores.password}
        secureTextEntry={!verClave}
        autoCapitalize="none"
        autoComplete={vm.esRegistro ? 'new-password' : 'current-password'}
        textContentType={vm.esRegistro ? 'newPassword' : 'password'}
        onSubmitEditing={onEnviar}
        sufijo={
          <IconButton
            icono={verClave ? 'visibility_off_outlined' : 'visibility_outlined'}
            tooltip={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            colorIcono={cs.onSurfaceVariant}
            tamanoIcono={22}
            onPress={() => setVerClave((antes) => !antes)}
          />
        }
      />
      {vm.esRegistro ? (
        <>
          <View style={{ height: 16 }} />
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
        <View accessibilityRole="alert" style={[estilos.aviso, { backgroundColor: cs.errorContainer }]}>
          <Icono nombre="error_outline_rounded" size={20} color={cs.onErrorContainer} />
          <Text style={{ flex: 1, color: cs.onErrorContainer, fontSize: AppText.cuerpoChico }}>{vm.error}</Text>
        </View>
      ) : null}
      <View style={{ height: 24 }} />
      <FilledButton
        accessibilityLabel={vm.esRegistro ? 'Crear cuenta' : 'Entrar'}
        onPress={vm.cargando ? null : onEnviar}
        style={estilos.principal}
      >
        {vm.cargando ? <GiradorDeBoton /> : <Text>{vm.esRegistro ? 'Crear cuenta' : 'Entrar'}</Text>}
      </FilledButton>
      <View style={{ height: 10 }} />
      <TextButton
        texto={vm.esRegistro ? 'Ya tengo cuenta — entrar' : 'Crear cuenta nueva'}
        onPress={onAlternarModo}
        style={estilos.centro}
      />
      {vm.ofreceCuentaDemo ? (
        <>
          <View style={{ height: 12 }} />
          <OutlinedButton accessibilityLabel="Usar cuenta demo" onPress={onUsarCuentaDemo} style={estilos.demo}>
            <Icono nombre="science_outlined" size={18} color={cs.onSurfaceVariant} />
            <Text style={{ color: cs.onSurfaceVariant }}>Usar cuenta demo</Text>
          </OutlinedButton>
        </>
      ) : null}
      <View style={{ height: 28 }} />
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
  formulario: { width: '100%', maxWidth: 420, paddingHorizontal: 24, alignSelf: 'center' },
  marca: { alignItems: 'center', marginBottom: 32 },
  titulo: { fontSize: AppText.tituloPagina, fontWeight: '800', letterSpacing: -0.8 },
  fraseCentrada: { textAlign: 'center' },
  entreCampos: { height: 14 },
  aviso: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  principal: { minHeight: 56 },
  centro: { alignSelf: 'center' },
  demo: { minHeight: 44, alignSelf: 'center', paddingHorizontal: 18 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
