import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LEGAL_VERSION } from '@/core';
import { useDependencies } from '@/composition';
import { Snackbar, showSnackbar } from '@/features/shared/snackbar';
import { TopBar } from '@/features/shell/components/TopBar';
import { ButtonSpinner } from '@/features/shell/components/ButtonSpinner';
import { AppRoutes } from '@/router';
import { Divider, Icon, OutlinedButton, SectionLabel, Text, TextButton, PageTitle, type IconName } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { AppearancePicker } from '../components/AppearancePicker';
import { InfoCard } from '../components/InfoCard';
import { useProfileViewModel, type ProfileViewModel } from '../view-models/useProfileViewModel';

/**
 * Pestaña «Perfil» (`ProfileView`): identidad, apariencia (claro/oscuro/sistema), confianza y
 * documentos legales. El estado vive en `useProfileViewModel` (MVVM). A diferencia de Explorar,
 * Agencias y Reservas, en Flutter no es keep-alive: carga al montarse.
 */
export function ProfileView() {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const router = useRouter();
  const { auth } = useDependencies();
  const vm = useProfileViewModel({ auth });
  const { load } = vm;

  useEffect(() => {
    void load();
  }, [load]);

  const handleSignOut = async () => {
    if ((await vm.signOut()) === false) showSnackbar('No pudimos cerrar la sesión. Intenta de nuevo.');
  };

  return (
    <View testID="screen-ProfileView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      <TopBar title={<PageTitle text="Perfil" />} />
      <ScrollView contentContainerStyle={styles.list}>
        {/* En pantallas anchas (web) una columna centrada: líneas legibles; en celular no cambia. */}
        <View testID="profile-column" style={styles.column}>
          <Identity vm={vm} />
          <View style={{ height: 28 }} />
          <SectionLabel text="Apariencia" />
          <AppearancePicker />
          <View style={{ height: 24 }} />
          <SectionLabel text="Confianza" />
          <InfoCard
            icon="verified_user_rounded"
            title="Compra protegida"
            body="Solo mostramos agencias con RNT vigente y matrícula mercantil verificadas por el equipo Diverso. Si una agencia cambia sus datos o se le vence el RNT, sus planes se ocultan hasta revalidarla."
          />
          <View style={{ height: 12 }} />
          <InfoCard
            icon="privacy_tip_rounded"
            title="Tus datos"
            body="Tratamos tus datos conforme a la Ley 1581 de 2012 (Habeas Data), únicamente para gestionar tu cuenta y tus reservas. Puedes consultar, actualizar o pedir la supresión de tus datos en cualquier momento."
          />
          <View style={{ height: 24 }} />
          <SectionLabel text="Documentos legales" />
          <View style={{ backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card, overflow: 'hidden' }}>
            <LegalRow
              icon="shield_outlined"
              title="Política de tratamiento de datos"
              onPress={() => router.push(AppRoutes.legal('privacidad') as Href)}
            />
            <Divider color={withAlpha(cs.outlineVariant, 0.5)} style={{ marginLeft: 56 }} />
            <LegalRow
              icon="description_outlined"
              title="Términos y condiciones"
              onPress={() => router.push(AppRoutes.legal('terminos-viajeros') as Href)}
            />
          </View>
          <View style={{ height: 28 }} />
          <OutlinedButton
            accessibilityLabel="Cerrar sesión"
            onPress={vm.signingOut ? null : () => void handleSignOut()}
            style={{ paddingLeft: 16 }}
          >
            {vm.signingOut ? <ButtonSpinner /> : <Icon name="logout_rounded" size={18} color={cs.error} />}
            <Text style={{ color: vm.signingOut ? undefined : cs.error }}>Cerrar sesión</Text>
          </OutlinedButton>
        </View>
      </ScrollView>
      <Snackbar aboveBottomBar />
    </View>
  );
}

/** Avatar, nombre y correo; si el perfil no cargó, un aviso con «Reintentar». */
function Identity({ vm }: { vm: ProfileViewModel }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={styles.identity}>
      <View style={[styles.avatar, { backgroundColor: cs.primaryContainer }]}>
        <Text style={{ fontSize: AppText.heading3xl, fontWeight: '800', color: cs.onPrimaryContainer }}>{vm.initial}</Text>
      </View>
      <View style={{ height: 12 }} />
      <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}>
        {vm.name}
      </Text>
      <Text style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant, textAlign: 'center' }}>{vm.email}</Text>
      {vm.error !== null ? (
        <View style={styles.error}>
          <Text style={{ fontSize: AppText.detail, color: cs.error, textAlign: 'center' }}>{vm.error}</Text>
          <TextButton text="Reintentar" onPress={() => void vm.load()} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * `ListTile` de un documento legal: ícono, título (16), «Versión …» (14 onSurfaceVariant) y
 * chevron; dos líneas → alto 72.
 */
function LegalRow({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.row}>
      {({ pressed }) => (
        <>
          {pressed ? (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, theme.components.pressedOpacity) }]}
            />
          ) : null}
          <Icon name={icon} size={24} color={cs.onSurfaceVariant} />
          <View style={{ width: 16 }} />
          <View style={styles.flex}>
            <Text height={1.5} style={{ fontSize: AppText.subtitle, letterSpacing: 0.5, color: cs.onSurface }}>
              {title}
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
const MAX_WIDTH = 720;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingLeft: 20, paddingTop: 12, paddingRight: 20, paddingBottom: 24 },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  identity: { alignItems: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingHorizontal: 16, paddingVertical: 8 },
});
