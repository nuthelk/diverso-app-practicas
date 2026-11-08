<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import Select from '$lib/shared/ui/Select.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { miCuentaDispersion, guardarCuentaDispersion } from '../api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { goto } from '$app/navigation';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import {
    BANCOS,
    TIPOS_CUENTA,
    TIPOS_DOCUMENTO,
    validarCuenta,
    type CuentaDispersion,
    type ErroresCuenta,
    type TipoCuenta,
    type TipoDocumento,
  } from '../model/liquidaciones';
  import type { Agency } from '$lib/features/agencias/model/agencia';

  const vacia = (): CuentaDispersion => ({
    banco: '',
    tipo_cuenta: 'ahorros',
    numero_cuenta: '',
    titular: '',
    tipo_documento: 'NIT',
    numero_documento: '',
  });

  let cargando = $state(true);
  let guardando = $state(false);
  let error = $state('');
  let agencia = $state<Agency | null>(null);
  let existe = $state(false);
  let c = $state<CuentaDispersion>(vacia());
  let intentado = $state(false);

  $effect(() => {
    (async () => {
      try {
        agencia = await miAgencia();
        const actual = agencia ? await miCuentaDispersion(agencia.id) : null;
        if (actual) {
          c = actual;
          existe = true;
        }
      } catch (e) {
        error = mensajeError(e);
      } finally {
        cargando = false;
      }
    })();
  });

  const errores = $derived<ErroresCuenta>(validarCuenta(c));
  /** Un error se muestra solo después del primer intento de guardar. */
  const mostrar = (mensaje?: string) => (intentado ? mensaje : undefined);

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    error = '';
    if (Object.keys(errores).length > 0 || !agencia) return;
    guardando = true;
    try {
      await guardarCuentaDispersion(agencia.id, c);
      avisar('Cuenta para dispersiones guardada.');
      goto('#/liquidaciones');
    } catch (err) {
      error = mensajeError(err);
    } finally {
      guardando = false;
    }
  }
</script>

{#if cargando}
  <EsqueletoPagina filas={4} clase="h-14" ancho={640} />
{:else if !agencia}
  <Empty
    icono={error ? 'sinConexion' : 'edificio'}
    titulo={error ? 'Sin conexión' : 'Aún no tienes agencia'}
    mensaje={error || 'Registra tu agencia para configurar tu cuenta para dispersiones.'}
  />
{:else}
  <Pagina ancho={640}>
    <PageHeader titulo="Cuenta para dispersiones">
      {#snippet contexto()}
        Es la cuenta a la que se dispersan tus liquidaciones. Solo tu agencia y el equipo Diverso pueden
        verla; en las listas solo se muestran los 4 últimos dígitos.
      {/snippet}
    </PageHeader>

    <p class="mt-4 text-detalle text-tinta-2">Todos los campos son obligatorios.</p>

    <Tarjeta etiqueta="Datos de la cuenta" clase="mt-3">
      <form class="space-y-4" onsubmit={guardar} novalidate>
        <Campo etiqueta="Banco" error={mostrar(errores.banco)}>
          {#snippet control(atributos)}
            <input
              class="campo"
              list="bancos-sugeridos"
              bind:value={c.banco}
              aria-required="true"
              autocomplete="off"
              {...atributos}
            />
            <datalist id="bancos-sugeridos">
              {#each BANCOS as b}<option value={b}></option>{/each}
            </datalist>
          {/snippet}
        </Campo>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <span id="etiqueta-tipo-cuenta" class="etiqueta-campo">Tipo de cuenta</span>
            <Select
              etiquetadoPor="etiqueta-tipo-cuenta"
              opciones={TIPOS_CUENTA.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
              valor={c.tipo_cuenta}
              onchange={(v) => (c.tipo_cuenta = v as TipoCuenta)}
            />
          </div>
          <Campo etiqueta="Número de cuenta" error={mostrar(errores.numero_cuenta)}>
            {#snippet control(atributos)}
              <input
                class="campo tabular-nums"
                inputmode="numeric"
                autocomplete="off"
                aria-required="true"
                bind:value={c.numero_cuenta}
                {...atributos}
              />
            {/snippet}
          </Campo>
        </div>

        <Campo etiqueta="Titular" error={mostrar(errores.titular)}>
          {#snippet control(atributos)}
            <input class="campo" bind:value={c.titular} aria-required="true" autocomplete="off" {...atributos} />
          {/snippet}
        </Campo>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <span id="etiqueta-tipo-documento" class="etiqueta-campo">Tipo de documento</span>
            <Select
              etiquetadoPor="etiqueta-tipo-documento"
              opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
              valor={c.tipo_documento}
              onchange={(v) => (c.tipo_documento = v as TipoDocumento)}
            />
          </div>
          <Campo etiqueta="Número de documento" error={mostrar(errores.numero_documento)}>
            {#snippet control(atributos)}
              <input
                class="campo tabular-nums"
                autocomplete="off"
                aria-required="true"
                bind:value={c.numero_documento}
                {...atributos}
              />
            {/snippet}
          </Campo>
        </div>

        {#if error}<AlertaError>{error}</AlertaError>{/if}

        <div class="flex justify-end gap-2 pt-1">
          <a class="btn btn-secundario" href="#/liquidaciones">Cancelar</a>
          <button type="submit" class="btn btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : existe ? 'Actualizar cuenta' : 'Guardar cuenta'}
          </button>
        </div>
      </form>
    </Tarjeta>
  </Pagina>
{/if}
