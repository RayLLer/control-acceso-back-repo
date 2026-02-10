/**
 * promo controller
 */

import { factories } from '@strapi/strapi';

import { sendToTokens } from '../../../services/fcm';

export default factories.createCoreController('api::promo.promo', ({ strapi }) => ({
	async update(ctx) {
		const response = await super.update(ctx);

		try {
			const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
				fields: ['fcm'],
			});

			const tokens = users
				.map((u: any) => u.fcm)
				.filter((t: any) => typeof t === 'string' && t.trim().length > 0);

			if (tokens.length > 0) {
				const title = 'Nueva Promoción';
				const body = (response?.data?.attributes?.texto);

				await sendToTokens(tokens, title, body, { promoId: response?.data?.id });
			}
		} catch (err) {
			strapi.log.error('Error enviando notificaciones FCM:', err);
		}

		return response;
	},
}));
