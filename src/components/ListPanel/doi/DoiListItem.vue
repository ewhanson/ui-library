<template>
	<div class="listPanel__item--doi">
		<div class="listPanel__itemSummary">
			<!-- Item selector -->
			<label class="listPanel__selectWrapper">
				<div class="listPanel__selector">
					<input
						type="checkbox"
						name="submissions[]"
						:value="item.id"
						v-model="isSelected"
						@click="toggleSelected"
					/>
				</div>
			</label>

			<!-- Item overview -->

			<!-- Submission -->
			<div v-if="isSubmission" class="listPanel__itemIdentity">
				<div class="listPanel__itemTitle doiListItem__itemTitle">
					{{ item.id }} /
					<span class="doiListItem__emphasis">
						{{ currentPublication.authorsStringShort }}
					</span>
					/
					<a
						:href="this.currentPublication.urlPublished"
						target="_blank"
						rel="noopener noreferrer"
					>
						{{ localize(currentPublication.fullTitle) }}
					</a>
				</div>
			</div>

			<!-- Issue -->
			<div v-else class="listPanel__itemIdentity">
				<div class="listPanel__itemSubtitle">
					<a :href="item.publishedUrl" target="_blank">
						{{ item.identification }}
					</a>
				</div>
			</div>

			<div class="listPanel__itemActions">
				<!-- DOI item metadata -->
				<div class="doiListItem__itemMetadata">
					<!--			TODO: Localize doi list metadata-->
					<badge v-if="!isPublished" class="doiListItem__itemMetadata--badge">
						{{ publicationStatusLabel }}
					</badge>
					<badge
						v-if="isPublished && !isDeposited && crossrefPluginEnabled"
						class="doiListItem__itemMetadata--badge"
						:is-warnable="true"
					>
						{{ __('plugins.importexport.crossref.status.notDeposited') }}
					</badge>
				</div>

				<expander
					:isExpanded="isExpanded"
					:itemName="item.id.toString()"
					@toggle="toggleExpanded"
				/>
			</div>
		</div>

		<!-- Expanded view/identifiers -->
		<div
			v-if="isExpanded"
			class="listPanel__itemExpanded listPanel__itemExpanded--doi"
		>
			<div class="doiListItem__doiSummary">
				<div class="doiListItem__doiDetail">
					<!-- TODO: Does not work with issues -->
					<pkp-button
						v-if="item['crossref::status'] === 'failed'"
						ref="depositFailureModalButton"
						@click="$modal.show('depositFailureMessage')"
					>
						<!-- TODO: Localized button name -->
						View error message
					</pkp-button>
					<modal
						v-bind="MODAL_PROPS"
						name="depositFailureMessage"
						@closed="setFocusToRef('depositFailureModalButton')"
					>
						<modal-content
							:closeLabel="__('common.close')"
							modalName="depositFailureMessage"
							title="Deposit Failure Message"
						>
							<!-- TODO: Add and localize explanatory message -->
							<p>
								---- Explanatory message about Crossref XML validation errors
								----
							</p>
							<div class="crossrefDepositError">
								<pre>{{ item['crossref::failedMsg'] }}</pre>
							</div>
						</modal-content>
					</modal>
				</div>
				<div class="doiListItem__doiActions">
					<badge v-if="crossrefPluginEnabled">
						{{ depositStatusString }}
					</badge>
				</div>
			</div>
			<pkp-table :columns="doiListColumns" :rows="doiList">
				<template slot-scope="{row, rowIndex}">
					<table-cell
						v-for="(column, columnIndex) in doiListColumns"
						:key="column.name"
						:column="column"
						:row="row"
						:tabindex="!rowIndex && !columnIndex ? 0 : -1"
					>
						<div v-if="column.name === 'doi'" class="doiListItem__doiSummary">
							<div class="doiListItem__doiDetail">
								<field-doi-text
									:value="
										mutableDois.find(item => item['id'] === row.id).identifier
									"
									:doiPrefix="doiPrefix"
									:is-editing-enabled="isEditingDoisEnabled"
									:name="row.id"
									:opt-into-edit="true"
									:opt-into-edit-label="__('common.edit')"
									@change="onDoiInputChanged"
								/>
							</div>
						</div>
					</table-cell>
				</template>
			</pkp-table>
			<div class="listPanel__itemExpandedActions">
				<pkp-button
					:is-disabled="isDeposited"
					@click="editOrSaveDois(isEditingDois)"
				>
					{{ isEditingDois ? 'Save changes' : 'Edit DOI(s)' }}
				</pkp-button>
				<pkp-button
					v-if="crossrefPluginEnabled"
					:is-disabled="isEditingDois"
					@click="triggerDeposit"
				>
					<!-- :is-primary="true" -->
					Deposit DOI(s)
				</pkp-button>
			</div>
		</div>
	</div>
</template>

<script>
import Expander from '@/components/Expander/Expander.vue';
import FieldDoiText from '@/components/Form/fields/FieldDoiText';
import modal from '@/mixins/modal';
import PkpTable from '@/components/Table/Table.vue';
import TableCell from '@/components/Table/TableCell';

export default {
	name: 'DoiListItem',
	components: {
		Expander,
		FieldDoiText,
		PkpTable,
		TableCell
	},
	mixins: [modal],
	props: {
		apiUrl: {
			type: String,
			required: true
		},
		doiPrefix: {
			type: String,
			default() {
				return '';
			}
		},
		item: {
			type: Object,
			required: true
		},
		selected: {
			type: Array,
			default() {
				return [];
			}
		},
		isExpanded: {
			type: Boolean
		},
		isSelected: {
			type: Boolean
		},
		crossrefPluginEnabled: {
			type: Boolean,
			default() {
				return false;
			}
		},
		isSubmission: {
			type: Boolean,
			default() {
				return true;
			}
		},
		hasDOIs: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	data() {
		return {
			doiListColumns: [
				{
					name: 'type',
					label: 'Type',
					value(row) {
						return row.type;
					}
				},
				{
					name: 'doi',
					label: 'DOI',
					value: 'value'
				}
			],
			isEditingDois: false,
			isEditingDoisEnabled: false,
			mutableDois: [],
			itemsToUpdate: {}
		};
	},
	computed: {
		/**
		 * The current publication of the submission
		 *
		 * @return {Object}
		 */
		currentPublication() {
			if (this.isSubmission === false) return null;

			return this.item.publications.find(
				publication => publication.id === this.item.currentPublicationId
			);
		},
		/**
		 * Gets doi list for current publication and galleys
		 *
		 * @return {Array}
		 */
		doiList() {
			let dois = [];

			// DOI List can come from either submission or issue, check submission first
			if (this.isSubmission === true) {
				// Get publication (article) DOIs
				if (
					this.currentPublication['pub-id::doi'] &&
					this.hasDOIs.includes('publications')
				) {
					dois.push({
						id: `article-${this.item.id}-${this.currentPublication.id}`,
						type: 'Article',
						identifier: this.currentPublication['pub-id::doi'],
						// TODO: Revisit removing deposit status. Only matters for submission as whole.
						depositStatus:
							this.item['crossref::status'] === null
								? 'notDeposited'
								: this.item['crossref::status'],
						apiPath: `${this.apiUrl}/${this.item.id}/publications/${this.currentPublication.id}/doi`
						// TODO: DOI is stored in publication but crossref deposit status is in submission only
					});
				}

				// Get galley DOIs
				if (this.hasDOIs.includes('representations')) {
					this.currentPublication.galleys.forEach(galley => {
						if (galley['pub-id::doi']) {
							dois.push({
								id: `galley-${this.item.id}-${this.currentPublication.id}-${galley.id}`,
								type: galley.label,
								identifier: galley['pub-id::doi'],
								depositStatus:
									this.item['crossref::status'] === null
										? 'notDeposited'
										: this.item['crossref::status'],
								apiPath: `${this.apiUrl}/${this.item.id}/publications/${this.currentPublication.id}/galleys/${galley.id}/doi`
							});
						}
					});
				}
			} else {
				// If not a submission, we have an issue
				if (this.item['pub-id::doi']) {
					dois.push({
						id: `issue-${this.item.id}`,
						type: 'Issue',
						identifier: this.item['pub-id::doi'],
						depositStatus: 'Not deposited', // TODO: Needs to be addressed for issues, use `publicationWithCrossrefStatus`
						apiPath: `${this.apiUrl}/${this.item.id}/doi`
					});
				}
			}

			this.updateMutableDois(dois);
			return dois;
		},
		/**
		 * Gets string for DOI deposit display
		 *
		 * @return {String}
		 */
		depositStatusString() {
			// TODO: Needs localization
			let item = this.isSubmission
				? this.item
				: this.publicationWithCrossrefStatus;

			return item['crossref::status'] === null
				? 'notDeposited'
				: item['crossref::status'];
		},
		/**
		 * Has the current item been deposited.
		 *
		 * @return {Boolean}
		 */
		isDeposited() {
			let item = this.isSubmission
				? this.item
				: this.publicationWithCrossrefStatus;

			return !(
				item['crossref::status'] === null ||
				item['crossref::status'] === 'failed'
			);
		},
		/**
		 * Has the current item been published.
		 *
		 * @return {Boolean}
		 */
		isPublished() {
			if (this.isSubmission) {
				// TODO: Should be pkp.const.STATUS_PUBLISHED, not included on this page
				return this.item.status === 3;
			} else {
				return this.item.isPublished;
			}
		},
		/**
		 * Display string for publication status
		 *
		 * @return {String}
		 */
		publicationStatusLabel() {
			if (this.isPublished) {
				return this.__('publication.status.published');
			} else {
				return this.__('publication.status.unpublished');
			}
		},
		/**
		 * Gets crossref status of first submission.
		 *
		 * For checking if issue has had DOI deposited along with a previous submission.
		 * Will check for registered/markRegistered, if failed will look for another registered submission.
		 *
		 * @returns {Object} Submission
		 */
		publicationWithCrossrefStatus() {
			if (this.isSubmission) return null;

			// Check if issue has at least one article associated with it
			if (this.item.articles && this.item.articles.length) {
				// We have at least one article
				for (const submission of this.item.articles) {
					if (
						submission['crossref::status'] === 'registered' ||
						submission['crossref::status'] === 'markedRegistered'
					) {
						return submission;
					}
				}

				return this.item.articles[0];
			} else {
				// Otherwise there are no articles associated with the issue
				// This means it is not deposited but also cannot be deposited so we return the standard 'not deposited' status
				return {'crossref::status': null};
			}
		}
	},
	methods: {
		updateMutableDois(doiList) {
			let dois = [];
			doiList.forEach(item => {
				dois.push({id: item.id, identifier: item.identifier});
			});

			this.mutableDois = dois;
		},
		editOrSaveDois(shouldSave) {
			shouldSave ? this.saveDois() : this.editDois();
		},
		editDois() {
			this.isEditingDois = true;
			this.isEditingDoisEnabled = true;
		},
		saveDois() {
			this.isEditingDoisEnabled = false;
			// Handle saving
			this.mutableDois.forEach(mutableDoi => {
				const oldDoiItem = this.doiList.find(item => item.id === mutableDoi.id);
				if (oldDoiItem.identifier !== mutableDoi.identifier) {
					this.itemsToUpdate[mutableDoi.id] = {
						isFinished: false,
						isSuccess: false,
						apiPath: oldDoiItem.apiPath,
						identifier: mutableDoi.identifier
					};
				}
			});
			window.console.log('Pre-save', this.itemsToUpdate);
			Object.keys(this.itemsToUpdate).forEach(itemId => {
				this.postUpdatedDoi(
					itemId,
					this.itemsToUpdate[itemId].apiPath,
					this.itemsToUpdate[itemId].identifier
				);
			});

			this.isEditingDois = false;
		},
		postUpdatedDoi(itemId, apiPath, identifierValue) {
			$.ajax({
				url: apiPath,
				type: 'POST',
				headers: {
					'X-Csrf-Token': pkp.currentUser.csrfToken,
					'X-Http-Method-Override': 'PUT',
					contentType: 'application/x-www-form-urlencoded'
				},
				data: {'pub-id::doi': `${identifierValue}`},
				indexValue: {
					itemId: itemId
				},
				success: response => this.postUpdatedDoiSuccess(response, itemId),
				error: response => this.postUpdatedDoiError(response, itemId),
				complete: response => this.postUpdatedDoiComplete(response, itemId)
			});
		},
		/**
		 * Callback to fire when the form submission's ajax request has been
		 * returned successfully
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} itemId Unique ID to identify object change requested
		 */
		postUpdatedDoiSuccess(response, itemId) {
			let items = {...this.itemsToUpdate};
			items[itemId].isSuccess = true;
			this.itemsToUpdate = items;
		},
		/**
		 * Callback to fire when the form submission's ajax request has been
		 * returned with errors
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} itemId Unique ID to identify object change requested
		 */
		postUpdatedDoiError(response, itemId) {
			let items = {...this.itemsToUpdate};
			items[itemId].isSuccess = false;
			this.itemsToUpdate = items;
		},
		/**
		 * Callback to fire when the form submission's ajax request has been
		 * returned, and the success or error callbacks have already been fired
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} itemId Unique ID to identify object change requested
		 */
		postUpdatedDoiComplete(response, itemId) {
			let items = {...this.itemsToUpdate};
			items[itemId].isFinished = true;
			this.itemsToUpdate = items;

			const isAllDoisUpdated = Object.keys(this.itemsToUpdate).every(
				itemId => this.itemsToUpdate[itemId].isFinished === true
			);

			if (isAllDoisUpdated) {
				let items = {...this.itemsToUpdate};
				let didUpdatesFail = false;

				Object.keys(items).forEach(itemId => {
					if (!items[itemId].isSuccess) {
						// TODO: Localize
						didUpdatesFail = true;
						delete items[itemId];
					}
				});
				this.itemsToUpdate = items;

				if (didUpdatesFail) {
					// TODO: See how this might work if one DOI is successfully updated and another is not.
					pkp.eventBus.$emit(
						'notify',
						'Some DOI(s) failed to update.',
						'warning'
					);
				}

				if (Object.keys(this.itemsToUpdate).length !== 0) {
					this.$emit('update-successful-doi-edits', this.itemsToUpdate);
					this.itemsToUpdate = {};
				}
			}
		},
		triggerDeposit() {
			// TODO: Use constant for 'deposit' string
			this.$emit('deposit-triggered', [this.item.id], 'deposit');
		},
		/**
		 * Toggles item as selected and notifies DoiListPanel
		 */
		toggleSelected() {
			this.$emit('select-item', this.item.id, !this.isSelected);
		},
		toggleExpanded() {
			this.$emit('expand-item', this.item.id, !this.isExpanded);
		},
		onDoiInputChanged(name, prop, newValue) {
			this.mutableDois.find(item => item.id === name).identifier = newValue;
		}
	}
};
</script>

<style lang="less">
@import '../../../styles/_import';

.crossrefDepositError {
	background: rgb(234, 237, 238);
}

.doiListItem__doiSummary {
	position: relative;
	display: flex;
	align-items: center;
	width: 100%;
}

.doiListItem__doiDetail {
	display: flex;
	flex: 1;
	min-width: 0;

	> * {
		white-space: nowrap;
	}

	// Space between each button or action
	> * + * {
		margin-left: 0.25rem;
	}
}

.doiListItem__doiDetail--editButton {
	margin-top: 0.25rem;
	margin-left: 0.25rem;
	margin-right: 0.25rem;
}

.doiListItem__doiActions {
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-left: 0.5rem;
	margin-right: 0.25rem;

	> * {
		// TODO: See if applicable anywhere. Otherwise remove. Use of "*" could cause problems down the line
		//white-space: nowrap;
	}

	// Space between each button or action
	> * + * {
		margin-left: 0.25rem;
	}
}

.doiListItem__emphasis {
	font-weight: 700;
}

.doiListItem__itemTitle {
	font-weight: 400;
}

.doiListItem__itemMetadata {
	margin-top: 0.5em;
	font-size: @font-tiny;
	line-height: 1.5em;
	color: @text;
}

.doiListItem__itemMetadata--badge {
	margin-right: 0.25rem;
}

.listPanel__itemExpanded--doi {
	margin-left: 2.25rem;
}

.listPanel__item--doi .listPanel__itemExpanded .pkpTable {
	margin-top: 0.5rem;
}
</style>
