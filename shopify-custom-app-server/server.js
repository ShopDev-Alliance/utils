import express from 'express';
import {shopifyApp} from '@shopify/shopify-app-express';

const API_KEY = ''; // <--- Replace with your API key from partner dashboard
const API_SECRET_KEY = ''; // <--- Replace with your API secret key from partner dashboard
const PORT = 8080;

const shopify = shopifyApp({
  api: {
    apiKey: API_KEY,
    apiSecretKey: API_SECRET_KEY,
    hostScheme: 'http',
    hostName: `localhost:${PORT}`,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: { path: '/api/webhooks' },
});

const app = express();
app.get(shopify.config.auth.path, shopify.auth.begin({ isOnline: true }));
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (_req, res, next) => {
    const session = res.locals.shopify.session;
    shopify.api.logger.info("admin", session);

    const client = await shopify.api.clients.Graphql({session});
		const response = await client.request(
			/* GraphQL */ `
				mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
					storefrontAccessTokenCreate(input: $input) {
						userErrors {
							field
							message
						}
						shop {
							id
						}
						storefrontAccessToken {
							accessScopes {
								handle
							}
							accessToken
							title
						}
					}
				}
			`,
			{
				variables: {
					input: {
						title: "Shopify Custom App Storefront Token",
					},
				}
			},
		);
		shopify.api.logger.info("storefront", response.data?.storefrontAccessTokenCreate?.storefrontAccessToken);

		return next();
  },
	shopify.redirectToShopifyOrAppRoot(),
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({webhookHandlers}),
);
app.get('/', shopify.ensureInstalledOnShop(), (_req, res) => res.send('OK'));
app.listen(PORT, () => console.log('server:8080'));
