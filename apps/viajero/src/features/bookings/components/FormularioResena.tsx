import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatFechaLarga } from '@/core';
import { FilledButton, Icono, Text, TextField } from '@/ui/components';
import { AppInsets, AppText, conAlfa, Duraciones, useTheme } from '@/ui/theme';

import { MAX_ESTRELLAS, type ReviewViewModel } from '../view-models/useReviewViewModel';

const ETIQUETAS: Record<number, string> = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena' };
const etiquetaDe = (calificacion: number) => ETIQUETAS[calificacion] ?? '¡Excelente!';

/**
 * Formulario de la reseña verificada (el `ReviewView` de Flutter): título del plan y fecha,
 * cinco estrellas (42, «N de 5 estrellas»), la etiqueta de la calificación con un fundido de
 * 150 ms, el comentario opcional (5 líneas, máx. 500 con contador) y «Publicar reseña». Mientras
 * envía —o ya publicada— todo queda bloqueado y el botón muestra un indicador.
 */
export function FormularioResena({ vm, onEnviar }: { vm: ReviewViewModel; onEnviar: (comentario: string) => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const [comentario, setComentario] = useState('');
  const plan = vm.reserva?.plan ?? null;
  const fecha = vm.reserva?.planDate?.fecha ?? null;
  const bloqueado = vm.enviando || vm.publicada;
  const colorBotonDeshabilitado = conAlfa(cs.onSurface, 0.38);

  return (
    <ScrollView contentContainerStyle={[AppInsets.pantalla, estilos.centro]} keyboardShouldPersistTaps="handled">
      <View style={estilos.columna}>
        {plan !== null ? (
          <>
            <Text
              altura={1.2}
              style={{ fontSize: AppText.encabezadoM, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}
            >
              {plan.titulo}
            </Text>
            {fecha !== null ? (
              <>
                <View style={{ height: 4 }} />
                <Text style={{ fontSize: AppText.detalle, color: cs.onSurfaceVariant, textAlign: 'center' }}>
                  {formatFechaLarga(fecha)}
                </Text>
              </>
            ) : null}
          </>
        ) : null}
        <View style={{ height: 30 }} />
        <Text style={{ fontSize: AppText.subtitulo, fontWeight: '700', color: cs.onSurface, textAlign: 'center' }}>
          ¿Cómo estuvo tu experiencia?
        </Text>
        <View style={{ height: 18 }} />
        <View style={estilos.estrellas}>
          {Array.from({ length: MAX_ESTRELLAS }, (_, i) => {
            const marcada = i < vm.calificacion;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1} de 5 estrellas`}
                accessibilityState={{ disabled: bloqueado, selected: marcada }}
                disabled={bloqueado}
                onPress={() => vm.calificar(i + 1)}
                style={estilos.estrella}
              >
                <Icono
                  nombre={marcada ? 'star_rounded' : 'star_outline_rounded'}
                  size={42}
                  color={marcada ? tema.diverso.dorado : cs.outline}
                />
              </Pressable>
            );
          })}
        </View>
        <EtiquetaCalificacion texto={etiquetaDe(vm.calificacion)} color={cs.primary} />
        <View style={{ height: 28 }} />
        <TextField
          valor={comentario}
          onChangeText={setComentario}
          etiqueta="Cuenta cómo te fue (opcional)"
          lineas={5}
          maxLength={500}
          deshabilitado={bloqueado}
        />
        <View style={{ height: 18 }} />
        <FilledButton
          accessibilityLabel="Publicar reseña"
          onPress={bloqueado ? null : () => onEnviar(comentario)}
          style={{ paddingLeft: 16 }}
        >
          {bloqueado ? (
            <View style={estilos.indicador}>
              <ActivityIndicator size="small" color={colorBotonDeshabilitado} style={{ transform: [{ scale: 0.85 }] }} />
            </View>
          ) : (
            <Icono nombre="send_rounded" size={17} color={cs.onPrimary} />
          )}
          <Text>Publicar reseña</Text>
        </FilledButton>
        <View style={{ height: 14 }} />
        <View style={estilos.pie}>
          <Icono nombre="verified_rounded" size={13} color={cs.tertiary} />
          <View style={{ width: 5 }} />
          <Text style={[estilos.encoger, { fontSize: AppText.leyenda, color: cs.onSurfaceVariant }]}>
            Reseña verificada: solo quien viajó puede opinar
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/** `AnimatedSwitcher(150 ms)`: cada etiqueta nueva entra con un fundido. */
function EtiquetaCalificacion({ texto, color }: { texto: string; color: string }) {
  const opacidad = useRef(new Animated.Value(1)).current;
  const anterior = useRef(texto);
  useEffect(() => {
    if (anterior.current === texto) return;
    anterior.current = texto;
    opacidad.setValue(0);
    const animacion = Animated.timing(opacidad, {
      toValue: 1,
      duration: Duraciones.etiquetaEstrellas,
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [texto, opacidad]);
  return (
    <Animated.View style={[estilos.etiqueta, { opacity: opacidad }]}>
      <Text style={{ color, fontWeight: '700', fontSize: AppText.enfasis }}>{texto}</Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  centro: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  columna: { width: '100%', maxWidth: 460, alignItems: 'stretch' },
  estrellas: { flexDirection: 'row', justifyContent: 'center' },
  estrella: { paddingHorizontal: 6, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { alignItems: 'center' },
  indicador: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
  pie: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  encoger: { flexShrink: 1 },
});
