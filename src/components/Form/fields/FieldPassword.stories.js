import FieldPassword from '@/components/Form/fields/FieldPassword.vue';
import FieldBaseMock from '@/components/Form/mocks/field-base';

export default {
	title: 'Forms/FieldPassword',
	component: FieldPassword,
	render: (args) => ({
		components: {FieldPassword},
		setup() {
			function change(name, prop, newValue, localeKey) {
				if (localeKey) {
					args[prop][localeKey] = newValue;
				} else {
					args[prop] = newValue;
				}
			}

			return {args, change};
		},
		template: `
			<FieldPassword v-bind="args" @change="change" />
		`,
	}),
};

export const Base = {
	args: {
		...FieldBaseMock,
		name: 'access-secret',
		component: 'field-password',
		label: 'Access Secret',
		isRequired: true,
		value: '',
	},
};
