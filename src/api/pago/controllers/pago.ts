/**
 * pago controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::pago.pago', ({ strapi }) => ({
	async create(ctx) {
		const response = await super.create(ctx);

		try {
			const requestData = ctx.request?.body?.data || ctx.request?.body || {};

			//const periodo ahora se va a construir mediante una cadena que se 
			// forma con 2 valores concatenados por :: el valor fecha response?.data?.attributes?.fecha_inicio_periodo 
			// y el valor fecha resultante de sumar 30 días o 31 días(segun corresponda el mes)
			//  al valor response?.data?.attributes?.fecha_inicio_periodo ejemplo si response?.data?.attributes?.fecha_inicio_periodo es 01/04/2026 
			// el valor período es 02/04/2026::02/05/2026 si si response?.data?.attributes?.fecha_inicio_periodo es 30/12/2026 el valor período 
			// es 30/12/2026::30/01/2027 si si en el caso de que response?.data?.attributes?.fecha_inicio_periodo sea 29/01/2026, 30/01/2026, 31/01/2026, 
			// se suma 30 días para el calculo del período
			const parseFecha = (fecha?: string | null): Date | null => {
				if (!fecha || typeof fecha !== 'string') return null;
				const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
				const iso = /^(\d{4})-(\d{2})-(\d{2})/;
				let match = fecha.match(ddmmyyyy);
				if (match) {
					const [, dd, mm, yyyy] = match;
					return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
				}
				match = fecha.match(iso);
				if (match) {
					const [, yyyy, mm, dd] = match;
					return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
				}

				const parsed = new Date(fecha);
				return Number.isNaN(parsed.getTime()) ? null : parsed;
			};

			const formatFecha = (date: Date) => {
				const dd = String(date.getDate()).padStart(2, '0');
				const mm = String(date.getMonth() + 1).padStart(2, '0');
				const yyyy = date.getFullYear();
				return `${dd}/${mm}/${yyyy}`;
			};

			const buildPeriodo = (
				fecha?: string | null,
				diario?: boolean | string | null,
				cantidadDias?: number | string | null,
			) => {
				const parsed = parseFecha(fecha);
				if (!parsed) {
					return fecha || null;
				};

				const isDiario = diario === true || diario === 'true';
				const parsedCantidadDias = Number(cantidadDias);
				const hasCantidadDias = isDiario && Number.isFinite(parsedCantidadDias) && parsedCantidadDias > 0;

				const defaultDaysToAdd = (parsed.getMonth() === 0 || parsed.getMonth() === 2 || parsed.getMonth() === 4 || parsed.getMonth() === 6 || parsed.getMonth() === 7 || parsed.getMonth() === 9 || parsed.getMonth() === 11) ? 31 : 30;
				const daysToAdd = hasCantidadDias ? parsedCantidadDias : defaultDaysToAdd;
				console.log('Mes:', parsed.getMonth(), 'Días a sumar:', daysToAdd, 'Diario:', isDiario, 'Cantidad dias:', cantidadDias);
				const next = new Date(parsed);
				next.setDate(next.getDate() + daysToAdd);

				return `${formatFecha(parsed)}::${formatFecha(next)}`;
			};

			const periodo = buildPeriodo(
				response?.data?.attributes?.fecha_inicio_periodo ||
				requestData?.fecha_inicio_periodo ||
				null,
				response?.data?.attributes?.diario ?? requestData?.diario ?? false,
				response?.data?.attributes?.cantidad_dias ?? requestData?.cantidad_dias ?? null,
			);

			let userId: number | string | null = null;

			const rel = response?.data?.attributes?.users_permissions_user;
			if (rel) {
				if (rel.data) userId = rel.data.id;
				else if (typeof rel === 'number' || typeof rel === 'string') userId = rel as any;
				else if ((rel as any).id) userId = (rel as any).id;
			}

			if (!userId) {
				const relReq = requestData?.users_permissions_user || requestData?.user || null;
				if (relReq) {
					if (typeof relReq === 'object' && (relReq as any).id) userId = (relReq as any).id;
					else userId = relReq as any;
				}
			}

			if (userId && periodo !== undefined && periodo !== null) {
				await strapi.entityService.update('plugin::users-permissions.user', userId, {
					data: { ultimoPeriodoPago: periodo },
				});
			}
		} catch (err) {
			strapi.log.error('Error updating ultimoPeriodoPago after pago create', err);
		}

		return response;
	},
}));
