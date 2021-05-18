<template>
	<div class="pkpFormField pkpFormField--text" :class="classes">
		<div class="pkpFormField__heading"></div>
		<div class="pkpFormField__control" :class="controlClasses">
			<div class="pkpFormField__control_top">
				<input
					class="pkpFormField__input pkpFormField--text__input"
					ref="input"
					v-model="currentValue"
					:type="inputType"
					:id="controlId"
					:name="localizedName"
					:aria-describedby="describedByIds"
					:aria-invalid="errors && errors.length"
					:disabled="!isEditingEnabled"
					:required="isRequired"
					:style="inputStyles"
				/>
			</div>
			<field-error
				v-if="errors && errors.length"
				:id="describedByErrorId"
				:messages="errors"
			/>
		</div>
	</div>
</template>

<script>
import FieldBase from './FieldBase.vue';

export default {
	name: 'FieldDoiText',
	extends: FieldBase,
	props: {
		doiPrefix: String,
		inputType: String,
		isEditingEnabled: {
			type: Boolean,
			required: true
		},
		size: {
			default: 'normal',
			validator: function(value) {
				return ['small', 'normal', 'large'].indexOf(value) !== -1;
			}
		},
		prefix: String
	},
	data() {
		return {
			inputStyles: {},
			isDisabled: false,
			isSaving: false,
			hasRecentSave: false,
			// recentSaveInterval: null,
			lastSaveTimestamp: -1
		};
	},
	computed: {
		/**
		 * Add classes to wrapper element based on configuration
		 *
		 * @return {Array}
		 */
		classes() {
			return ['pkpFormField--size' + this.size];
		},

		/**
		 * Add classes to the input control
		 *
		 * @return {Array}
		 */
		controlClasses() {
			let classes = [];
			if (this.isMultilingual && this.locales.length > 1) {
				classes.push('pkpFormField__control--hasMultilingualIndicator');
			}
			if (this.prefix) {
				classes.push('pkpFormField__control--hasPrefix');
			}
			return classes;
		}
	},
	watch: {
		isDisabled(newValue, oldValue) {
			if (newValue === false && this.value === null) {
				this.currentValue = this.doiPrefix;
			}
		}
	},
	mounted() {
		// Set the field to disabled if optIntoEdit is passed
		if (this.optIntoEdit) {
			this.isDisabled = true;
		}
	}
};
</script>

<style lang="less">
@import '../../../styles/_import';

// From FormPage.vue
.pkpFormPage__status {
	display: inline-block;
	margin-right: 0.5rem;
	font-size: @font-tiny;
	transition: all 0.3s;
	text-align: right;

	.fa {
		color: @yes;
	}

	.pkpSpinner {
		margin-right: 0.25rem;
	}
}

.pkpFormPage__status-enter {
	transform: translateY(0.5rem);
	opacity: 0;
}

.pkpFormPage__status-leave-to {
	transform: translateY(-0.5rem);
	opacity: 0;
}
</style>
