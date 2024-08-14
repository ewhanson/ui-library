<template>
	<div class="pkpFormField pkpFormField--password">
		<div class="pkpFormField__heading">
			<FormFieldLabel
				:control-id="controlId"
				:label="label"
				:locale-label="localeLabel"
				:is-required="isRequired"
				:required-label="t('common.required')"
				:multilingual-label="multilingualLabel"
			/>
			<Tooltip
				v-if="isPrimaryLocale && tooltip"
				aria-hidden="true"
				:tooltip="tooltip"
				label=""
			/>
			<span
				v-if="isPrimaryLocale && tooltip"
				:id="describedByTooltipId"
				class="-screenReader"
				v-html="tooltip"
			/>
			<HelpButton
				v-if="isPrimaryLocale && helpTopic"
				:id="describedByHelpId"
				:topic="helpTopic"
				:section="helpSection"
				:label="t('help.help')"
			/>
		</div>
		<div
			v-if="isPrimaryLocale && description"
			:id="describedByDescriptionId"
			class="pkpFormField__description"
			v-html="description"
		/>
		<div class="pkpFormField__control">
			<div class="pkpFormField__control_top flex">
				<input
					:id="controlId"
					ref="input"
					v-model="currentValue"
					class="pkpFormField__input pkpFormField--text__input"
					:type="inputType"
					:name="localizedName"
					:aria-describedby="describedByIds"
					:aria-invalid="errors && errors.length"
					:disabled="isDisabled"
					:required="isRequired"
				/>
				<PkpButton
					class="pkpFormField__control--password__button"
					@click="toggleValueVisible"
				>
					{{ isValueVisible ? 'Hide value' : 'Show value' }}
				</PkpButton>
			</div>
			<FieldError
				v-if="errors && errors.length"
				:id="describedByErrorId"
				:messages="errors"
			/>
		</div>
	</div>
</template>

<script>
import FieldBase from '@/components/Form/fields/FieldBase.vue';
import FormFieldLabel from '@/components/Form/FormFieldLabel.vue';
import HelpButton from '@/components/HelpButton/HelpButton.vue';
import PkpButton from '@/components/Button/Button.vue';
import Tooltip from '@/components/Tooltip/Tooltip.vue';
import FieldError from '@/components/Form/FieldError.vue';

export default {
	name: 'FieldPassword',
	components: {
		FieldError,
		FormFieldLabel,
		HelpButton,
		PkpButton,
		Tooltip,
	},
	extends: FieldBase,
	data() {
		return {
			isValueVisible: false,
			isDisabled: false,
		};
	},
	computed: {
		inputType() {
			return this.isValueVisible ? 'text' : 'password';
		},
	},
	methods: {
		toggleValueVisible() {
			this.isValueVisible = !this.isValueVisible;
		},
	},
};
</script>

<style scoped lang="less">
.pkpFormField__control--password__button {
	margin-inline-start: 0.25rem;
}
</style>
