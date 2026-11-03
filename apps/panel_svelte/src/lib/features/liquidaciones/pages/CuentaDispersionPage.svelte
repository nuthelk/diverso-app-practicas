<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import Select from '$lib/shared/ui/Select.svelte';
  import AvisoPrueba from '../components/AvisoPrueba.svelte';
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
  <div class="space-y-3 p-7">
    {#each Array(4) as _}<Skeleton clase="h-14 rounded-xl" />{/each}
  </div>
{:else if !agencia}
  <Empty
    icono="🏢"
    titulo={error ? 'Sin conexión' : 'Aún no tienes agencia'}
    mensaje={error || 'Registra tu agencia para configurar tu cuenta para dispersiones.'}
  />
{:else}
  <div class="aparecer mx-auto max-w-[640px] px-4 py-6 sm:px-7">
    <h1 class="text-[24px] font-extrabold tracking-tight">Cuenta para dispersiones</h1>
    <p class="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
      Es la cuenta a la que se dispersan tus liquidaciones. Solo tu agencia y el equipo Diverso pueden
      verla; en las listas solo se muestran los 4 últimos dígitos.
    </p>
    <div class="mt-4"><AvisoPrueba>Guardar tu cuenta no mueve dinero: las dispersiones son registros de prueba.</AvisoPrueba></div>

    <form class="tarjeta mt-5 space-y-4 p-6" onsubmit={guardar} novalidate>
      <label class="block">
        <span class="etiqueta-campo">Banco *</span>
        <input
          class="campo"
          list="bancos-sugeridos"
          bind:value={c.banco}
          aria-invalid={intentado && !!errores.banco}
          autocomplete="off"
        />
        <datalist id="bancos-sugeridos">
          {#each BANCOS as b}<option value={b}></option>{/each}
        </datalist>
        {#if intentado && errores.banco}<span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.banco}</span>{/if}
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <span class="etiqueta-campo">Tipo de cuenta *</span>
          <Select
            opciones={TIPOS_CUENTA.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
            valor={c.tipo_cuenta}
            onchange={(v) => (c.tipo_cuenta = v as TipoCuenta)}
          />
        </div>
        <label class="block">
          <span class="etiqueta-campo">Número de cuenta *</span>
          <input
            class="campo tabular-nums"
            inputmode="numeric"
            autocomplete="off"
            bind:value={c.numero_cuenta}
            aria-invalid={intentado && !!errores.numero_cuenta}
          />
          {#if intentado && errores.numero_cuenta}<span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.numero_cuenta}</span>{/if}
        </label>
      </div>

      <label class="block">
        <span class="etiqueta-campo">Titular *</span>
        <input class="campo" bind:value={c.titular} aria-invalid={intentado && !!errores.titular} autocomplete="off" />
        {#if intentado && errores.titular}<span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.titular}</span>{/if}
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <span class="etiqueta-campo">Tipo de documento *</span>
          <Select
            opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
            valor={c.tipo_documento}
            onchange={(v) => (c.tipo_documento = v as TipoDocumento)}
          />
        </div>
        <label class="block">
          <span class="etiqueta-campo">Número de documento *</span>
          <input
            class="campo tabular-nums"
            autocomplete="off"
            bind:value={c.numero_documento}
            aria-invalid={intentado && !!errores.numero_documento}
          />
          {#if intentado && errores.numero_documento}<span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.numero_documento}</span>{/if}
        </label>
      </div>

      {#if error}<p class="text-[13px] font-medium text-red-600" role="alert">{error}</p>{/if}

      <div class="flex justify-end gap-2 pt-1">
        <a class="btn btn-secundario" href="#/liquidaciones">Cancelar</a>
        <button type="submit" class="btn btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : existe ? 'Actualizar cuenta' : 'Guardar cuenta'}
        </button>
      </div>
    </form>
  </div>
{/if}
