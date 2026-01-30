/**
 * pago controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::pago.pago', ({ strapi }) => ({
	async create(ctx) {
		const response = await super.create(ctx);

		try {
			const requestData = ctx.request?.body?.data || ctx.request?.body || {};

			const periodo =
				response?.data?.attributes?.periodo_pagado ||
				response?.data?.attributes?.peri ||
				requestData?.periodo_pagado ||
				requestData?.peri ||
				null;

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
