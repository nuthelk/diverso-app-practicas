import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LEGAL_VERSION } from '@/core';
import { useDependencies } from '@/composition';
import { AvisoFlotante, mostrarAviso } from '@/features/compartido/aviso-flotante';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { GiradorDeBoton } from '@/features/shell/components/GiradorDeBoton';
import { AppRoutes } from '@/router';
import { Divider, Icon, OutlinedButton, SectionLabel, Text, TextButton, TituloPagina, type IconName } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { SelectorApariencia } from '../components/SelectorApariencia';
import { TarjetaInfo } from '../components/TarjetaInfo';
import { useProfileViewModel, type ProfileViewModel } from '../view-models/useProfileViewModel';

/**
 * Pestaña «Perfil» (`ProfileView`): identidad, apariencia (claro/oscuro/sistema), confianza y
 * documentos legales. El estado vive en `useProfileViewModel` (MVVM). A diferencia de Explorar,
 * Agencias y Reservas, en Flutter no es keep-alive: carga al montarse.
 */
export function ProfileView() {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const router = useRouter();
  const { auth } = useDependencies();
  const vm = useProfileViewModel({ auth });
  const { cargar } = vm;

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrarSesion = async () => {
    if ((await vm.cerrarSesion()) === false) mostrarAviso('No pudimos cerrar la sesión. Intenta de nuevo.');
  };

  return (
    <View testID="pantalla-ProfileView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo={<TituloPagina texto="Perfil" />} />
      <ScrollView contentContainerStyle={estilos.lista}>
        {/* En pantallas anchas (web) una columna centrada: líneas legibles; en celular no cambia. */}
        <View testID="columna-perfil" style={estilos.columna}>
          <Identidad vm={vm} />
          <View style={{ height: 28 }} />
          <SectionLabel text="Apariencia" />
          <SelectorApariencia />
          <View style={{ height: 24 }} />
          <SectionLabel text="Confianza" />
          <TarjetaInfo
            icono="verified_user_rounded"
            titulo="Compra protegida"
            cuerpo="Solo mostramos agencias con RNT vigente y matrícula mercantil verificadas por el equipo Diverso. Si una agencia cambia sus datos o se le vence el RNT, sus planes se ocultan hasta revalidarla."
          />
          <View style={{ height: 12 }} />
          <TarjetaInfo
            icono="privacy_tip_rounded"
            titulo="Tus datos"
            cuerpo="Tratamos tus datos conforme a la Ley 1581 de 2012 (Habeas Data), únicamente para gestionar tu cuenta y tus reservas. Puedes consultar, actualizar o pedir la supresión de tus datos en cualquier momento."
          />
          <View style={{ height: 24 }} />
          <SectionLabel text="Documentos legales" />
          <View style={{ backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card, overflow: 'hidden' }}>
            <FilaLegal
              icono="shield_outlined"
              titulo="Política de tratamiento de datos"
              onPress={() => router.push(AppRoutes.legal('privacidad') as Href)}
            />
            <Divider color={withAlpha(cs.outlineVariant, 0.5)} style={{ marginLeft: 56 }} />
            <FilaLegal
              icono="description_outlined"
              titulo="Términos y condiciones"
              onPress={() => router.push(AppRoutes.legal('terminos-viajeros') as Href)}
            />
          </View>
          <View style={{ height: 28 }} />
          <OutlinedButton
            accessibilityLabel="Cerrar sesión"
            onPress={vm.cerrandoSesion ? null : () => void cerrarSesion()}
            style={{ paddingLeft: 16 }}
          >
            {vm.cerrandoSesion ? <GiradorDeBoton /> : <Icon name="logout_rounded" size={18} color={cs.error} />}
            <Text style={{ color: vm.cerrandoSesion ? undefined : cs.error }}>Cerrar sesión</Text>
          </OutlinedButton>
        </View>
      </ScrollView>
      <AvisoFlotante sobreBarraInferior />
    </View>
  );
}

/** Avatar, nombre y correo; si el perfil no cargó, un aviso con «Reintentar». */
function Identidad({ vm }: { vm: ProfileViewModel }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={estilos.identidad}>
      <View style={[estilos.avatar, { backgroundColor: cs.primaryContainer }]}>
        <Text style={{ fontSize: AppText.heading3xl, fontWeight: '800', color: cs.onPrimaryContainer }}>{vm.inicial}</Text>
      </View>
      <View style={{ height: 12 }} />
      <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}>
        {vm.nombre}
      </Text>
      <Text style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant, textAlign: 'center' }}>{vm.email}</Text>
      {vm.error !== null ? (
        <View style={estilos.error}>
          <Text style={{ fontSize: AppText.detail, color: cs.error, textAlign: 'center' }}>{vm.error}</Text>
          <TextButton texto="Reintentar" onPress={() => void vm.cargar()} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * `ListTile` de un documento legal: ícono, título (16), «Versión …» (14 onSurfaceVariant) y
 * chevron; dos líneas → alto 72.
 */
function FilaLegal({ icono, titulo, onPress }: { icono: IconName; titulo: string; onPress: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={onPress} style={estilos.fila}>
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, tema.components.pressedOpacity) }]}
            />
          ) : null}
          <Icon name={icono} size={24} color={cs.onSurfaceVariant} />
          <View style={{ width: 16 }} />
          <View style={estilos.flex}>
            <Text height={1.5} style={{ fontSize: AppText.subtitle, letterSpacing: 0.5, color: cs.onSurface }}>
              {titulo}
            </Text>
            <Text style={{ color: cs.onSurfaceVariant }}>{`Versión ${LEGAL_VERSION}`}</Text>
          </View>
          <View style={{ width: 16 }} />
          <Icon name="chevron_right_rounded" size={24} color={cs.onSurfaceVariant} />
        </>
      )}
    </Pressable>
  );
}

/** Ancho máximo de la columna del perfil en pantallas anchas. */
const ANCHO_MAXIMO = 720;

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { paddingLeft: 20, paddingTop: 12, paddingRight: 20, paddingBottom: 24 },
  columna: { width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  identidad: { alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 16, paddingVertical: 8 },
});
