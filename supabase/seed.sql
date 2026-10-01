-- =====================================================================
-- Diverso App — seed de desarrollo
-- Datos demo: usuarios, agencias (mayoría verificadas), planes reales de
-- Antioquia, calendario de cupos y reservas pasadas con reseñas.
-- Contraseña de TODAS las cuentas demo: demo1234
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuarios demo (auth.users dispara el trigger que crea profiles)
-- ---------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        confirmation_token, recovery_token, email_change,
                        email_change_token_new, reauthentication_token,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'viajero@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Valentina Restrepo","rol":"viajero","telefono":"3104567890"}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'santiago@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Santiago Gaviria","rol":"viajero","telefono":"3129876543"}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'ecoandes@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Andrea Echeverri","rol":"agencia","telefono":"3145550111"}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'graffiti@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Jeison Castaño","rol":"agencia","telefono":"3145550222"}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'patrimonio@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Luz Marina Betancur","rol":"agencia","telefono":"3145550333"}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'admin@demo.com', crypt('demo1234', gen_salt('bf')), now(), now(), now(),
   '', '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Admin Diverso","rol":"admin"}');

-- ---------------------------------------------------------------------
-- Agencias (12) — 10 verificadas, 1 pendiente (dueña con login), 1 sin dueño demo
-- ---------------------------------------------------------------------
insert into public.agencies (owner_user_id, nombre, descripcion, numero_rnt, matricula_camara_comercio,
                             ciudad, telefono, email, whatsapp, estado_verificacion)
values
  ((select id from auth.users where email='ecoandes@demo.com'),
   'EcoAndes Viajes', 'Operadora de ecoturismo y aventura con 8 años de experiencia en Antioquia. Guías certificados y grupos pequeños.',
   '85421', '02345678-9', 'Medellín', '604 444 1122', 'hola@ecoandes.demo', '+573145550111', 'verificado'),
  (null, 'Guatapé Destinos SAS', 'Especialistas en Guatapé y el Peñol. Salidas diarias desde Medellín en vans confortables.',
   '71932', '01122334-5', 'Guatapé', '604 555 2233', 'reservas@guatapedestinos.demo', '+573145550222', 'verificado'),
  (null, 'Rutas de Antioquia Cultural', 'Viajes culturales por los pueblos patrimonio del suroeste antioqueño.',
   '66104', '04455667-8', 'Medellín', '604 666 3344', 'info@rutasdemo.demo', '+573145550333', 'verificado'),
  (null, 'Café y Montaña Tours', 'Rutas cafeteras y experiencias en finca con familias caficultoras.',
   '58377', '07788990-1', 'Fredonia', '604 777 4455', 'cafe@cafeymontana.demo', '+573145550444', 'verificado'),
  (null, 'Aventura Claro Expediciones', 'Deporte extremo en el cañón del río Claro: canopy, tubing y espeleísmo.',
   '44950', '09900112-3', 'Puerto Triunfo', '604 888 5566', 'aventura@claro.demo', '+573145550555', 'verificado'),
  (null, 'Oeste Antioqueño Expediciones', 'Descubre el occidente: Puente de Occidente, tubing por el río Cauca y aguas termales.',
   '39216', '02233445-6', 'Santa Fe de Antioquia', '604 999 6677', 'oeste@expediciones.demo', '+573145550666', 'verificado'),
  ((select id from auth.users where email='patrimonio@demo.com'),
   'Pueblos Patrimonio Travel', 'Escapadas de 2 días por Jardín, Jericó y Fredonia con hospedaje típico. (Agencia en proceso de verificación RNT)',
   '90118', '05566778-9', 'Medellín', '604 111 7788', 'viajes@patrimonio.demo', '+573145550777', 'pendiente'),
  ((select id from auth.users where email='graffiti@demo.com'),
   'Comuna 13 Graffiti Tours', 'Tours urbanos con guías locales de la Comuna 13: arte, historia, street food y transformación social.',
   '77849', '08899001-2', 'Medellín', '604 222 8899', 'tours@comuna13.demo', '+573145550888', 'verificado'),
  (null, 'Medellín Sky Parapente', 'Vuelos en parapente biplaza sobre el valle de San Félix con pilotos certificados.',
   '52263', '03344556-7', 'Bello', '604 333 9900', 'vuela@sky.demo', '+573145550999', 'verificado'),
  (null, 'Arví Naturaleza Viva', 'Senderismo, mariposario y bosque de niebla en el Parque Ecoturístico Arví.',
   '63780', '06677889-0', 'Medellín', '604 444 0011', 'naturaleza@arvi.demo', '+573145551000', 'verificado'),
  (null, 'Sabaneta Gourmet Experiences', 'Rutas gastronómicas y clases de cocina con abuelas cocineras del sur del valle.',
   '81025', '01990011-2', 'Sabaneta', '604 555 1122', 'sabor@sabaneta.demo', '+573145551111', 'verificado'),
  (null, 'Río y Selva Colombia', 'Expediciones de varios días con hospedaje en reservas naturales de Antioquia.',
   '49571', '04211335-6', 'Medellín', '604 666 2233', 'expediciones@rioy Selva.demo', '+573145551222', 'verificado');

-- ---------------------------------------------------------------------
-- Planes (34) — precios de mercado COP, precio final todo incluido
-- ---------------------------------------------------------------------
insert into public.plans (agency_id, titulo, destino, categoria, resumen, descripcion, duracion_texto,
                          duracion_horas, punto_encuentro, precio_cop, incluye, incluye_transporte,
                          incluye_comida, incluye_hospedaje, itinerario, politica_cancelacion, fotos, estado)
values
-- EcoAndes (5)
((select id from public.agencies where numero_rnt='85421'),
 'Guatapé y Piedra del Peñol — día completo', 'Guatapé', 'aventura',
 'El clásico imperdible: subida a la Piedra, malecón y pueblo colorido, todo en un día.',
 'Salimos de Medellín temprano, subimos los 740 escalones de la Piedra del Peñol, almorzamos frente al embalse y recorremos el malecón y las coloridas calles de Guatapé. Guía certificado y grupos de máximo 14 personas.',
 '1 día', 12, 'Parque El Poblado, entrada principal', 165000,
 '{"Transporte ida y vuelta en van climatizado","Entrada a la Piedra del Peñol","Almuerzo típico (bandeja o trucha)","Guía certificado","Barco corto por el embalse"}',
 true, true, false,
 '[{"hora":"07:00","actividad":"Salida desde El Poblado"},{"hora":"09:00","actividad":"Llegada y subida a la Piedra del Peñol"},{"hora":"11:30","actividad":"Paseo en barco por el embalse"},{"hora":"12:30","actividad":"Almuerzo frente al malecón"},{"hora":"14:00","actividad":"Recorrido por el casco colorido de Guatapé"},{"hora":"17:00","actividad":"Regreso a Medellín"}]',
 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50%. Menos de 24 horas: sin reembolso.',
 '{"https://picsum.photos/seed/guata-penol-1/800/500","https://picsum.photos/seed/guata-penol-2/800/500","https://picsum.photos/seed/guata-penol-3/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='85421'),
 'Escapada a Guatapé 2 días con hospedaje', 'Guatapé', 'relax',
 'Dos días para disfrutar Guatapé sin afán: Piedra, malecón, kayak y atardecer en el embalse.',
 'Noche de hospedaje en hotel boutique del centro histórico, subida a la Piedra al amanecer, tarde de kayak en el embalse y tiempo libre para recorrer las calles. Ideal para parejas.',
 '2 días / 1 noche', 40, 'Parque El Poblado, entrada principal', 449000,
 '{"Transporte ida y vuelta","1 noche en hotel boutique (habitación doble)","Desayuno y 2 almuerzos","Entrada a la Piedra","Kayak 1 hora","Guía los dos días"}',
 true, true, true,
 '[{"hora":"Día 1 - 07:30","actividad":"Salida de Medellín"},{"hora":"Día 1 - 11:00","actividad":"Malecón y almuerzo"},{"hora":"Día 1 - 15:00","actividad":"Kayak en el embalse"},{"hora":"Día 1 - 18:00","actividad":"Check-in y atardecer en el pueblo"},{"hora":"Día 2 - 06:30","actividad":"Amanecer en la Piedra del Peñol"},{"hora":"Día 2 - 13:00","actividad":"Regreso a Medellín"}]',
 'Cancelación gratuita hasta 7 días antes. Entre 7 y 3 días: 50%. Menos de 72 horas: sin reembolso.',
 '{"https://picsum.photos/seed/guata-2dias-1/800/500","https://picsum.photos/seed/guata-2dias-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='85421'),
 'Río Claro: cañón y aventura', 'Puerto Triunfo', 'aventura',
 'Bosque húmedo tropical, canopy sobre el cañón y baño en aguas cristalinas.',
 'Día completo en la reserva natural del cañón del río Claro: canopy de 500 metros sobre el cañón, caminatas por el bosque y tiempo para bañarse en las pozas. Almuerzo incluido.',
 '1 día', 13, 'Parque Berrío, costado norte', 149000,
 '{"Transporte ida y vuelta","Entrada a la reserva","Canopy (2 líneas)","Almuerzo","Guía de aventura","Equipo de seguridad"}',
 true, true, false,
 '[{"hora":"06:30","actividad":"Salida desde el centro"},{"hora":"09:30","actividad":"Llegada a Río Claro"},{"hora":"10:00","actividad":"Canopy sobre el cañón"},{"hora":"12:30","actividad":"Almuerzo"},{"hora":"14:00","actividad":"Pozas y sendero del bosque"},{"hora":"16:30","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 72 horas antes. Menos de 72 horas: sin reembolso.',
 '{"https://picsum.photos/seed/rioclaro-1/800/500","https://picsum.photos/seed/rioclaro-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='85421'),
 'Santa Fe de Antioquia colonial', 'Santa Fe de Antioquia', 'cultura',
 'Pueblo patrimonio, Puente de Occidente y helados de frutas tropicales.',
 'Recorrido por el centro histórico de Santa Fe de Antioquia, visita al Puente de Occidente (monumento nacional), tiempo para el mercado y las famosas frutas del calentao.',
 '1 día', 11, 'Parque Berrío, costado norte', 135000,
 '{"Transporte ida y vuelta","Guía cultural","Entrada al Puente de Occidente","Helado típico","Recorrido centro histórico"}',
 true, false, false,
 '[{"hora":"07:30","actividad":"Salida"},{"hora":"09:30","actividad":"Puente de Occidente"},{"hora":"11:00","actividad":"Centro histórico y catedral"},{"hora":"12:30","actividad":"Almuerzo libre en el mercado"},{"hora":"15:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
 '{"https://picsum.photos/seed/santafe-1/800/500","https://picsum.photos/seed/santafe-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='85421'),
 'Parapente San Félix — vuelo de 15 minutos', 'San Félix', 'aventura',
 'Despega y vuela sobre el valle con piloto certificado. Sin experiencia previa.',
 'Vuelo biplaza de 15 minutos sobre el valle de Aburrá desde el despegue de San Félix. Incluye transporte desde Medellín, seguro y video opcional. El precio es final: no hay cargos adicionales.',
 '1 día', 6, 'Parque El Poblado, entrada principal', 320000,
 '{"Transporte ida y vuelta","Vuelo biplaza 15 minutos","Piloto certificado y seguro","Equipo completo"}',
 true, false, false,
 '[{"hora":"08:00","actividad":"Salida de Medellín"},{"hora":"09:00","actividad":"Llegada al despegue y briefing"},{"hora":"09:30","actividad":"Vuelo biplaza"},{"hora":"11:00","actividad":"Regreso"}]',
 'Reprogramación gratuita si el clima no permite volar. Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/parapente-1/800/500","https://picsum.photos/seed/parapente-2/800/500"}', 'publicado'),

-- Guatapé Destinos (3)
((select id from public.agencies where numero_rnt='71932'),
 'Guatapé Premium con vuelo panorámico', 'Guatapé', 'aventura',
 'La experiencia completa: vuelo en avioneta sobre el embalse, Piedra y malecón.',
 'Tour premium en grupos de 8: vuelo panorámico de 20 minutos sobre el embalse, subida a la Piedra, almuerzo en restaurante mirador y tarde en el pueblo.',
 '1 día', 12, 'Hotel Dann Carlton, El Poblado', 389000,
 '{"Vuelo panorámico 20 minutos","Transporte ida y vuelta","Entrada a la Piedra","Almuerzo mirador","Guía bilingüe"}',
 true, true, false,
 '[{"hora":"07:00","actividad":"Salida"},{"hora":"08:30","actividad":"Vuelo panorámico"},{"hora":"10:30","actividad":"Piedra del Peñol"},{"hora":"12:30","actividad":"Almuerzo mirador"},{"hora":"14:30","actividad":"Guatapé pueblo"},{"hora":"17:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 5 días antes. Entre 5 y 2 días: 50%. Menos de 48 horas: sin reembolso.',
 '{"https://picsum.photos/seed/guata-premium-1/800/500","https://picsum.photos/seed/guata-premium-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='71932'),
 'El Peñol y malecón — medio día', 'Guatapé', 'relax',
 'Solo lo esencial: Piedra del Peñol y malecón, de vuelta en Medellín a las 2 pm.',
 'Opción corta para quien tiene poco tiempo: subida a la Piedra, paseo por el malecón y regreso. Sin almuerzo (precio final más bajo).',
 'Medio día', 7, 'Parque El Poblado, entrada principal', 119000,
 '{"Transporte ida y vuelta","Entrada a la Piedra","Paseo por el malecón","Guía"}',
 true, false, false,
 '[{"hora":"07:00","actividad":"Salida"},{"hora":"09:00","actividad":"Piedra del Peñol"},{"hora":"11:00","actividad":"Malecón"},{"hora":"14:00","actividad":"Regreso en Medellín"}]',
 'Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/penol-medio-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='71932'),
 'Fin de semana en Guatapé — 2 días', 'Guatapé', 'relax',
 'Hospedaje frente al embalse, bici de agua y noche de faroles.',
 'Dos días con hospedaje frente al embalse, actividades acuáticas incluidas y la tradicional noche de faroles del pueblo.',
 '2 días / 1 noche', 44, 'Parque El Poblado, entrada principal', 475000,
 '{"Transporte ida y vuelta","1 noche frente al embalse","Desayuno y almuerzos","Bici de agua 1 hora","Entrada a la Piedra"}',
 true, true, true,
 '[{"hora":"Día 1 - 08:00","actividad":"Salida"},{"hora":"Día 1 - 11:00","actividad":"Check-in y bici de agua"},{"hora":"Día 1 - 18:00","actividad":"Noche de faroles"},{"hora":"Día 2 - 08:00","actividad":"Desayuno y Piedra"},{"hora":"Día 2 - 14:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.',
 '{"https://picsum.photos/seed/guata-findesemana-1/800/500"}', 'publicado'),

-- Rutas Culturales (3)
((select id from public.agencies where numero_rnt='66104'),
 'Jardín: pueblo patrimonio y cascadas', 'Jardín', 'cultura',
 'El pueblo más lindo de Antioquia, con cascada y gira por fincas paneleras.',
 'Recorrido por el caserío de Jardín, visita a la cascada La Escalera y a una finca panelera tradicional. Almuerzo con trucha de la región.',
 '1 día', 13, 'Parque Berrío, costado norte', 159000,
 '{"Transporte ida y vuelta","Guía cultural","Cascada La Escalera","Finca panelera","Almuerzo típico"}',
 true, true, false,
 '[{"hora":"06:30","actividad":"Salida"},{"hora":"09:30","actividad":"Llegada a Jardín"},{"hora":"10:00","actividad":"Cascada La Escalera"},{"hora":"12:30","actividad":"Almuerzo"},{"hora":"14:00","actividad":"Parque y finca panelera"},{"hora":"17:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/jardin-1/800/500","https://picsum.photos/seed/jardin-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='66104'),
 'Jericó 2 días: cuna de la paisa', 'Jericó', 'cultura',
 'Pueblo patrimonio, museo de Madre Laura y cerro Las Nubes.',
 'Dos días en Jericó: museo de Madre Laura, subida al cerro Las Nubes, taller de mochilas arhuacas y noches de pueblo tranquilo.',
 '2 días / 1 noche', 40, 'Parque Berrío, costado norte', 419000,
 '{"Transporte ida y vuelta","1 noche en hotel del parque","Desayunos y un almuerzo","Museo y cerro Las Nubes","Taller de mochilas"}',
 true, true, true,
 '[{"hora":"Día 1 - 07:00","actividad":"Salida"},{"hora":"Día 1 - 11:00","actividad":"Museo Madre Laura"},{"hora":"Día 1 - 15:00","actividad":"Cerro Las Nubes"},{"hora":"Día 2 - 09:00","actividad":"Taller de mochilas"},{"hora":"Día 2 - 14:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 5 días antes. Menos de 5 días: 50%.',
 '{"https://picsum.photos/seed/jerico-1/800/500","https://picsum.photos/seed/jerico-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='66104'),
 'Santa Fe termal: pueblo + aguas termales', 'Santa Fe de Antioquia', 'relax',
 'Mañana colonial y tarde de aguas termales en el occidente antioqueño.',
 'Centro histórico por la mañana y tarde relajante en un balneario termal. Incluye entrada y transporte.',
 '1 día', 11, 'Niquía, estación del metro', 178000,
 '{"Transporte ida y vuelta","Guía","Entrada al balneario termal","Recorrido centro histórico"}',
 true, false, false,
 '[{"hora":"07:30","actividad":"Salida"},{"hora":"09:30","actividad":"Centro histórico"},{"hora":"12:30","actividad":"Almuerzo libre"},{"hora":"14:00","actividad":"Aguas termales"},{"hora":"17:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/termales-1/800/500"}', 'publicado'),

-- Café y Montaña (3)
((select id from public.agencies where numero_rnt='58377'),
 'Ruta del café en finca familiar', 'Fredonia', 'gastronomia',
 'Del grano a la taza con una familia caficultora, con almuerzo de finca.',
 'Día completo en finca cafetera familiar: recorrido por los cafetales, proceso de beneficiado, catación y almuerzo de olla montada con productos de la finca.',
 '1 día', 10, 'Parque Berrío, costado norte', 145000,
 '{"Transporte ida y vuelta","Recorrido del café","Catación","Almuerzo de finca","1 libra de café de regalo"}',
 true, true, false,
 '[{"hora":"07:00","actividad":"Salida"},{"hora":"09:30","actividad":"Llegada a la finca"},{"hora":"10:00","actividad":"Cafetales y proceso"},{"hora":"12:30","actividad":"Almuerzo de finca"},{"hora":"14:00","actividad":"Catación"},{"hora":"16:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 72 horas antes.',
 '{"https://picsum.photos/seed/cafe-1/800/500","https://picsum.photos/seed/cafe-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='58377'),
 'Cabalgata cafetera y tubing', 'Fredonia', 'aventura',
 'Cabalgata entre cafetales por la mañana y flotaje por el río en la tarde.',
 'Cabalgata guiada de 2 horas entre montañas cafeteras, almuerzo y tubing tranquilo por el río. No requiere experiencia.',
 '1 día', 11, 'Parque Berrío, costado norte', 189000,
 '{"Transporte ida y vuelta","Cabalgata 2 horas","Tubing","Almuerzo","Guías y equipo"}',
 true, true, false,
 '[{"hora":"07:00","actividad":"Salida"},{"hora":"09:30","actividad":"Cabalgata"},{"hora":"12:00","actividad":"Almuerzo"},{"hora":"14:00","actividad":"Tubing"},{"hora":"16:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/cabalgata-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='58377'),
 'Experiencia barista y catación premium', 'Medellín', 'gastronomia',
 'Tarde de catación profesional en el corazón de El Poblado.',
 'Tarde de catación con barista campeón: 4 orígenes de Antioquia, métodos de filtrado y maridaje con postres locales.',
 'Medio día', 4, 'Calle 10 #36-20, El Poblado', 98000,
 '{"Catación 4 orígenes","Guía barista","Maridaje de postres","Kit de catación"}',
 false, true, false,
 '[{"hora":"14:00","actividad":"Bienvenida y orígenes"},{"hora":"14:45","actividad":"Métodos de filtrado"},{"hora":"15:30","actividad":"Maridaje"},{"hora":"17:00","actividad":"Cierre"}]',
 'Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/barista-1/800/500"}', 'publicado'),

-- Aventura Claro (2)
((select id from public.agencies where numero_rnt='44950'),
 'Espeleísmo en cuevas de Río Claro', 'Puerto Triunfo', 'aventura',
 'Recorre cuevas de mármol con guía especializado. Adrenalina pura.',
 'Aventura subterránea: caminata por el bosque, espeleísmo en las cuevas de mármol del cañón y baño en el río. Requiere buen estado físico.',
 '1 día', 13, 'Parque Berrío, costado norte', 179000,
 '{"Transporte ida y vuelta","Entrada a la reserva","Espeleísmo con guía especializado","Casco y linterna","Almuerzo"}',
 true, true, false,
 '[{"hora":"06:30","actividad":"Salida"},{"hora":"09:30","actividad":"Caminata al cañón"},{"hora":"10:30","actividad":"Espeleísmo"},{"hora":"13:00","actividad":"Almuerzo"},{"hora":"14:30","actividad":"Río y regreso"}]',
 'Cancelación gratuita hasta 72 horas antes. Requiere condición física media.',
 '{"https://picsum.photos/seed/cuevas-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='44950'),
 'Canopy y tubing extremo', 'Puerto Triunfo', 'aventura',
 'Las líneas más largas del cañón y flotaje con rápidos suaves.',
 'Paquete de adrenalina: 4 líneas de canopy (la última de 800 metros) y tubing de 5 kilómetros por el río Claro.',
 '1 día', 12, 'Parque Berrío, costado norte', 199000,
 '{"Transporte ida y vuelta","4 líneas de canopy","Tubing 5 km","Almuerzo","Guías y equipo completo"}',
 true, true, false,
 '[{"hora":"06:30","actividad":"Salida"},{"hora":"09:30","actividad":"Canopy"},{"hora":"12:30","actividad":"Almuerzo"},{"hora":"14:00","actividad":"Tubing"},{"hora":"16:30","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 72 horas antes.',
 '{"https://picsum.photos/seed/canopy-1/800/500"}', 'publicado'),

-- Oeste (2)
((select id from public.agencies where numero_rnt='39216'),
 'Puente de Occidente y tubing por el Cauca', 'Santa Fe de Antioquia', 'aventura',
 'Monumento nacional de 1887 y flotaje relajado por el río Cauca.',
 'Visita guiada al Puente de Occidente, tubing de 8 km por el Cauca y tarde libre en Santa Fe.',
 '1 día', 11, 'Niquía, estación del metro', 155000,
 '{"Transporte ida y vuelta","Entrada al Puente","Tubing 8 km","Almuerzo","Guía"}',
 true, true, false,
 '[{"hora":"07:00","actividad":"Salida"},{"hora":"09:00","actividad":"Puente de Occidente"},{"hora":"11:00","actividad":"Tubing"},{"hora":"13:00","actividad":"Almuerzo"},{"hora":"15:00","actividad":"Santa Fe libre"},{"hora":"17:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/puente-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='39216'),
 'Santa Fe de Antioquia histórico — medio día', 'Santa Fe de Antioquia', 'cultura',
 'Ciudad madre de Antioquia en una mañana: catedral, calle Real y heladerías.',
 'Recorrido a pie por la ciudad fundada en 1541: catedral, calle Real, museo religioso y las tradicionales neverías del parque.',
 'Medio día', 6, 'Niquía, estación del metro', 89000,
 '{"Transporte ida y vuelta","Guía cultural","Museo religioso","Café de bienvenida"}',
 true, false, false,
 '[{"hora":"07:30","actividad":"Salida"},{"hora":"09:00","actividad":"Centro histórico a pie"},{"hora":"11:30","actividad":"Neverías del parque"},{"hora":"13:30","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/santafe-histo-1/800/500"}', 'publicado'),

-- Pueblos Patrimonio (pendiente → borrador)
((select id from public.agencies where numero_rnt='90118'),
 'Jardín completo 2 días', 'Jardín', 'cultura',
 'Todo Jardín en dos días: cascadas, cable, garzas y noches de pueblo.',
 'Plan de 2 días con hospedaje en hotel del parque, cascada La Escalera, cable aéreo, gallera cultural y observatorio de garzas corocoras.',
 '2 días / 1 noche', 40, 'Parque Berrío, costado norte', 425000,
 '{"Transporte ida y vuelta","1 noche con desayuno","Cascada y cable","Almuerzos","Guía"}',
 true, true, true,
 '[{"hora":"Día 1 - 07:00","actividad":"Salida"},{"hora":"Día 1 - 11:00","actividad":"Cascada La Escalera"},{"hora":"Día 1 - 16:00","actividad":"Garzas al atardecer"},{"hora":"Día 2 - 09:00","actividad":"Cable y gallera cultural"},{"hora":"Día 2 - 14:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 7 días antes.',
 '{"https://picsum.photos/seed/jardin2d-1/800/500"}', 'borrador'),

-- Comuna 13 (3)
((select id from public.agencies where numero_rnt='77849'),
 'Graffiti tour Comuna 13 con guía local', 'Medellín', 'urbano',
 'La historia de la transformación contada por quienes la vivieron.',
 'Tour a pie por las escaleras eléctricas y los murales más icónicos de la Comuna 13, con guía nacido y criado en la comuna. Incluye paleta típica.',
 '3 horas', 3.5, 'Estación San Javier, salida 2', 75000,
 '{"Guía local de la comuna","Paleta típica","Seguro de viaje","Apoyo a proyectos sociales"}',
 false, false, false,
 '[{"hora":"09:00","actividad":"Encuentro en San Javier"},{"hora":"09:15","actividad":"Escaleras eléctricas e historia"},{"hora":"10:15","actividad":"Murales icónicos"},{"hora":"11:00","actividad":"Mirador y paleta"},{"hora":"12:00","actividad":"Cierre"}]',
 'Cancelación gratuita hasta 12 horas antes.',
 '{"https://picsum.photos/seed/comuna13-1/800/500","https://picsum.photos/seed/comuna13-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='77849'),
 'Street food tour: sabores de la comuna', 'Medellín', 'gastronomia',
 'Arepa de huevo, chocorramo, mango y los secretos gastronómicos del 13.',
 'Recorrido gastronómico por los puestos locales de la Comuna 13: 7 paradas con comida y bebidas incluidas, historias de cocina urbana.',
 '3.5 horas', 3.5, 'Estación San Javier, salida 2', 95000,
 '{"7 paradas gastronómicas","Comida y bebidas incluidas","Guía local","Recetario digital"}',
 false, true, false,
 '[{"hora":"10:00","actividad":"Encuentro"},{"hora":"10:15","actividad":"Arepas y fritos"},{"hora":"11:15","actividad":"Dulces tradicionales"},{"hora":"12:00","actividad":"Cierre con café"}]',
 'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.',
 '{"https://picsum.photos/seed/streetfood-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='77849'),
 'Comuna 13 + cable tour completo', 'Medellín', 'urbano',
 'Graffiti tour más recorrido en cable: la Medellín que se transformó.',
 'Combina el graffiti tour clásico con un recorrido en Metrocable por la comuna, miradores y el parque biblioteca España.',
 '5 horas', 5, 'Estación San Javier, salida 2', 129000,
 '{"Guía local","Graffiti tour","Metrocable","Parque Biblioteca España","Café típico"}',
 false, true, false,
 '[{"hora":"09:00","actividad":"Encuentro en San Javier"},{"hora":"09:15","actividad":"Graffiti tour"},{"hora":"11:00","actividad":"Metrocable y miradores"},{"hora":"12:30","actividad":"Parque Biblioteca España"},{"hora":"13:30","actividad":"Café y cierre"}]',
 'Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/comuna13cable-1/800/500"}', 'publicado'),

-- Sky Parapente (2)
((select id from public.agencies where numero_rnt='52263'),
 'Parapente premium 20 minutos + video', 'San Félix', 'aventura',
 'Vuelo extendido con video HD incluido y despegue garantizado.',
 'Vuelo biplaza de 20 minutos con térmicas del mediodía, video HD de la experiencia y snack en el despegue.',
 '1 día', 6, 'Parque El Poblado, entrada principal', 399000,
 '{"Vuelo 20 minutos","Video HD incluido","Transporte ida y vuelta","Seguro y equipo","Snack en el despegue"}',
 true, false, false,
 '[{"hora":"09:00","actividad":"Salida de Medellín"},{"hora":"10:00","actividad":"Briefing y despegue"},{"hora":"12:30","actividad":"Video y regreso"}]',
 'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/parapente20-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='52263'),
 'Bautismo de vuelo — 10 minutos', 'San Félix', 'aventura',
 'Tu primer vuelo: suave, seguro y con las mejores vistas del valle.',
 'Vuelo biplaza corto ideal para primeras veces: despegue asistido, planeo suave sobre San Félix y aterrizaje en el mismo punto.',
 '1 día', 5, 'Parque El Poblado, entrada principal', 269000,
 '{"Vuelo 10 minutos","Transporte ida y vuelta","Piloto certificado","Seguro"}',
 true, false, false,
 '[{"hora":"08:30","actividad":"Salida"},{"hora":"09:30","actividad":"Briefing"},{"hora":"10:00","actividad":"Vuelo"},{"hora":"12:00","actividad":"Regreso"}]',
 'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/bautismo-1/800/500"}', 'publicado'),

-- Arví (2)
((select id from public.agencies where numero_rnt='63780'),
 'Parque Arví: senderismo y mariposario', 'Medellín', 'naturaleza',
 'Bosque de niebla a 30 minutos de la ciudad, con guía ambiental.',
 'Día de bosque: senderismo guiado por el bosque de niebla, mariposario y picnic local en la zona de camping.',
 '1 día', 7, 'Estación Acevedo, Metrocable Arví', 115000,
 '{"Guía ambiental","Senderismo 3 horas","Mariposario","Picnic local","Seguro"}',
 false, true, false,
 '[{"hora":"08:00","actividad":"Subida en Metrocable Arví"},{"hora":"09:00","actividad":"Senderismo"},{"hora":"12:00","actividad":"Picnic"},{"hora":"13:30","actividad":"Mariposario"},{"hora":"15:30","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 24 horas antes.',
 '{"https://picsum.photos/seed/arvi-1/800/500","https://picsum.photos/seed/arvi-2/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='63780'),
 'Observación de aves en Santa Elena', 'Santa Elena', 'naturaleza',
 'Madrugada con ornitólogo: más de 40 especies posibles en un día.',
 'Salida de avistamiento con ornitólogo profesional por los bosques de Santa Elena. Binoculos y checklist incluidos.',
 'Medio día', 6, 'Estación Acevedo, salida principal', 139000,
 '{"Guía ornitólogo","Binoculos profesionales","Checklist de especies","Café campesino","Seguro"}',
 false, true, false,
 '[{"hora":"05:30","actividad":"Encuentro en Acevedo"},{"hora":"06:15","actividad":"Caminata al bosque"},{"hora":"06:30","actividad":"Avistamiento"},{"hora":"10:30","actividad":"Café y checklist"},{"hora":"11:30","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/aves-1/800/500"}', 'publicado'),

-- Sabaneta Gourmet (2)
((select id from public.agencies where numero_rnt='81025'),
 'Ruta gastronómica del sur', 'Sabaneta', 'gastronomia',
 'Sabaneta tradicional: bandeja paisa, postres de abuela y tragos de la región.',
 'Caminata gastronómica por Sabaneta: restaurante de bandeja paisa centenario, helados artesanales y bar de aguardiente y cerveza artesanal.',
 '4 horas', 4, 'Parque de Sabaneta, entrada principal', 110000,
 '{"Bandeja paisa","Postres artesanales","Degustación de licores locales","Guía local"}',
 false, true, false,
 '[{"hora":"12:00","actividad":"Encuentro en el parque"},{"hora":"12:15","actividad":"Bandeja paisa centenaria"},{"hora":"14:00","actividad":"Postres de abuela"},{"hora":"15:00","actividad":"Licores locales"},{"hora":"16:00","actividad":"Cierre"}]',
 'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.',
 '{"https://picsum.photos/seed/sabaneta-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='81025'),
 'Clase de cocina: aprende la bandeja paisa', 'Sabaneta', 'gastronomia',
 'Cocina tu propia bandeja paisa con doña Eufemia y llévate el recetario.',
 'Clase práctica de cocina tradicional en cocina de casa sabaneteña: fríjoles cargamanto, chicharrón y arepa, con recetario de regalo.',
 '4 horas', 4, 'Calle 74 #43-10, Sabaneta', 135000,
 '{"Clase con cocinera local","Ingredientes y utensilios","Almuerzo (lo que cocines)","Recetario digital"}',
 false, true, false,
 '[{"hora":"10:00","actividad":"Bienvenida y mercado"},{"hora":"10:45","actividad":"Fríjoles y chicharrón"},{"hora":"12:30","actividad":"Arepa y aguacate"},{"hora":"13:30","actividad":"Almuerzo compartido"}]',
 'Cancelación gratuita hasta 48 horas antes.',
 '{"https://picsum.photos/seed/cocina-1/800/500"}', 'publicado'),

-- Río y Selva (2)
((select id from public.agencies where numero_rnt='49571'),
 'Río Claro 2 días con hospedaje', 'Puerto Triunfo', 'naturaleza',
 'Duérmete en el cañón: reserva natural, pozas y noches de bosque.',
 'Dos días en la reserva del cañón: hospedaje en cabañas del bosque, canopy, pozas privadas y caminata nocturna guiada.',
 '2 días / 1 noche', 44, 'Parque Berrío, costado norte', 489000,
 '{"Transporte ida y vuelta","1 noche en cabaña","Todas las comidas","Canopy","Caminata nocturna"}',
 true, true, true,
 '[{"hora":"Día 1 - 06:30","actividad":"Salida"},{"hora":"Día 1 - 10:00","actividad":"Canopy y pozas"},{"hora":"Día 1 - 19:30","actividad":"Caminata nocturna"},{"hora":"Día 2 - 09:00","actividad":"Sendero del bosque"},{"hora":"Día 2 - 14:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.',
 '{"https://picsum.photos/seed/rioclaro2d-1/800/500"}', 'publicado'),

((select id from public.agencies where numero_rnt='49571'),
 'Cascadas de San Rafael', 'San Rafael', 'naturaleza',
 'Pozas turquesa escondidas en el oriente antioqueño.',
 'Día completo visitando tres cascadas de aguas turquesa cerca a San Rafael, con guía local y almuerzo.',
 '1 día', 12, 'Parque Berrío, costado norte', 159000,
 '{"Transporte ida y vuelta","3 cascadas","Guía local","Almuerzo","Seguro"}',
 true, true, false,
 '[{"hora":"06:00","actividad":"Salida"},{"hora":"09:00","actividad":"Primera cascada"},{"hora":"11:30","actividad":"Segunda y tercera poza"},{"hora":"13:00","actividad":"Almuerzo"},{"hora":"16:00","actividad":"Regreso"}]',
 'Cancelación gratuita hasta 72 horas antes.',
 '{"https://picsum.photos/seed/sanrafael-1/800/500"}', 'publicado');

-- ---------------------------------------------------------------------
-- Calendario de cupos + reservas históricas + reseñas
-- ---------------------------------------------------------------------
do $$
declare
  p record;
  d date;
  v_cupo int;
  v_booking_id uuid;
  v_viajero1 uuid := (select id from auth.users where email='viajero@demo.com');
  v_viajero2 uuid := (select id from auth.users where email='santiago@demo.com');
  v_count int := 0;
  v_metodos text[] := array['pse','nequi','daviplata','tarjeta'];
  v_comentarios text[] := array[
    'Súper recomendado, el guía llegó puntual y todo salió tal como lo describían. Precio final sin sorpresas.',
    'Excelente experiencia, la reserva tomó 2 minutos y la confirmación llegó al instante.',
    'Muy buena la organización. El almuerzo estaba delicioso y el bus muy cómodo.',
    'Cumplieron todo lo prometido. Volvería a reservar sin dudar.',
    'La agencia es muy seria, se nota que están registradas. Tranquilidad total con el pago.',
    'Buen plan para escaparse un domingo. Los cupos en línea evitan las vueltas de WhatsApp.',
    'Preciosa la experiencia, el guía conocía toda la historia del lugar.',
    'Todo muy puntual y bien organizado. La política de cancelación es clara desde el inicio.'
  ];
begin
  perform setseed(0.42);

  -- Fechas futuras (próximos 75 días, cada 3 días) y pasadas (reviews)
  for p in select id from public.plans where estado = 'publicado' loop
    -- Futuro
    for d in select generate_series(current_date + 2, current_date + 75, interval '3 days')::date loop
      if random() < 0.85 then
        v_cupo := 8 + floor(random() * 17)::int;
        insert into public.plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
        values (p.id, d, v_cupo, v_cupo);
      end if;
    end loop;
    -- Pasado (últimos 70 días, semanal) —cupos agotados en su mayoría
    for d in select generate_series(current_date - 70, current_date - 7, interval '7 days')::date loop
      v_cupo := 8 + floor(random() * 17)::int;
      insert into public.plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
      values (p.id, d, v_cupo, 0);
    end loop;
  end loop;

  -- Reservas pasadas (completadas, con pago y reseña) para los dos viajeros demo
  for p in select pd.id as plan_date_id, pd.plan_id, pl.precio_cop, pl.titulo
           from public.plan_dates pd
           join public.plans pl on pl.id = pd.plan_id
          where pd.fecha < current_date - 20
            and pd.fecha > current_date - 65
            and pl.estado = 'publicado'
          order by random()
          limit 14 loop
    v_count := v_count + 1;
    insert into public.bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado, created_at)
    values (
      'DIV-SEED' || lpad(v_count::text, 4, '0'),
      p.plan_date_id,
      case when v_count % 2 = 0 then v_viajero1 else v_viajero2 end,
      1 + floor(random() * 3)::int,
      p.precio_cop * (1 + floor(random() * 3)::int),
      'completada',
      now() - ((random() * 40)::int * interval '1 day')
    )
    returning id into v_booking_id;

    insert into public.payments (booking_id, metodo, estado, monto, referencia, provider, simulated, created_at)
    values (v_booking_id,
            (v_metodos[1 + floor(random() * 4)::int])::public.payment_method,
            'aprobado',
            (select monto_total from public.bookings where id = v_booking_id),
            'SIM-SEED' || lpad(v_count::text, 4, '0'),
            'simulado', true, now() - ((random() * 40)::int * interval '1 day'));

    if random() < 0.75 then
      insert into public.reviews (booking_id, calificacion, comentario)
      values (v_booking_id,
              case when random() < 0.8 then 5 else 4 end,
              v_comentarios[1 + floor(random() * array_length(v_comentarios, 1))::int]);
    end if;
  end loop;

  -- Reservas futuras confirmadas para el viajero demo (pantalla "Mis reservas")
  insert into public.bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  select 'DIV-FUT01', pd.id, v_viajero1, 2, pl.precio_cop * 2, 'confirmada'
    from public.plan_dates pd
    join public.plans pl on pl.id = pd.plan_id
   where pl.titulo like 'Guatapé y Piedra del Peñol%'
     and pd.fecha between current_date + 10 and current_date + 20
   order by pd.fecha limit 1;

  insert into public.bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  select 'DIV-FUT02', pd.id, v_viajero1, 1, pl.precio_cop, 'confirmada'
    from public.plan_dates pd
    join public.plans pl on pl.id = pd.plan_id
   where pl.titulo = 'Graffiti tour Comuna 13 con guía local'
     and pd.fecha between current_date + 5 and current_date + 15
   order by pd.fecha limit 1;

  insert into public.payments (booking_id, metodo, estado, monto, referencia, provider, simulated)
  select b.id, 'nequi', 'aprobado', b.monto_total, 'SIM-' || b.codigo, 'simulado', true
    from public.bookings b where b.codigo in ('DIV-FUT01','DIV-FUT02');
end;
$$;
