<template>
	<div class="doiListPanel">
		<slot>
			<list-panel :items="items" :isSidebarVisible="isSidebarVisible">
				<template slot="header">
					<pkp-header>
						<h2>{{ title }}</h2>
						<spinner v-if="isLoading" />
						<template slot="actions">
							<search
								:searchPhrase="searchPhrase"
								@search-phrase-changed="setSearchPhrase"
							/>

							<!-- TODO: Localize dropdown -->
							<dropdown label="Bulk Actions">
								<div class="pkpDropdown__section">
									<ul>
										<li>
											<button
												class="pkpDropdown__action"
												@click="toggleSelectAll"
											>
												{{ isAllSelected ? 'Deselect all' : 'Select all' }}
											</button>
										</li>
										<li>
											<button
												class="pkpDropdown__action"
												@click="toggleExpandAll"
											>
												<!-- TODO: Localize text -->
												{{ isAllExpanded ? 'Collapse all' : 'Expand all' }}
											</button>
										</li>
										<!--										TODO: Consider adding separate Collapse all item-->
									</ul>
								</div>

								<div class="pkpDropdown__section">
									<div class="app__userNav__loggedInAs">
										Take action on {{ selected.length }} selected item(s)
									</div>
									<ul>
										<li>
											<button
												class="pkpDropdown__action"
												@click="openDepositDialog(selected, 'export')"
											>
												Export
											</button>
										</li>

										<li>
											<button
												class="pkpDropdown__action"
												@click="openDepositDialog(selected, 'markRegistered')"
											>
												Mark registered
											</button>
										</li>

										<li>
											<button
												class="pkpDropdown__action"
												@click="openDepositDialog(selected, 'deposit')"
											>
												Deposit
											</button>
										</li>

										<!--										<li>-->
										<!--											<button class="pkpDropdown__action">-->
										<!--												Assign DOIs-->
										<!--											</button>-->
										<!--										</li>-->
									</ul>
								</div>
							</dropdown>

							<!-- TODO: Localize -->
							<pkp-button
								ref="modalDepositButton"
								:isPrimary="true"
								@click="openDepositDialog"
							>
								Deposit
							</pkp-button>
						</template>
					</pkp-header>
				</template>

				<template slot="sidebar">
					<pkp-header :isOneLine="false">
						<h3>
							<icon icon="filter" :inline="true" />
							{{ __('common.filter') }}
						</h3>
					</pkp-header>
					<div
						v-for="(filterSet, index) in filters"
						:key="index"
						class="listPanel__block"
					>
						<pkp-header v-if="filterSet.heading">
							<h4>{{ filterSet.heading }}</h4>
						</pkp-header>
						<component
							v-for="filter in filterSet.filters"
							:key="filter.param + filter.value"
							:is="filter.filterType || 'pkp-filter'"
							v-bind="filter"
							:isFilterActive="isFilterActive(filter.param, filter.value)"
							@add-filter="addFilter"
							@remove-filter="removeFilter"
							@update-filter="addFilter"
						/>
					</div>
				</template>

				<!-- TODO: Temporary solution to no items found text appearing on load -->
				<template slot="itemsEmpty">
					<template v-if="isLoading">
						<spinner />
						{{ __('common.loading') }}
					</template>
					<template v-else>
						{{ __('common.noItemsFound') }}
					</template>
				</template>

				<template v-slot:item="{item}">
					<slot name="item" :item="item">
						<doi-list-item
							:key="item.id"
							:item="item"
							:api-url="apiUrl"
							:doi-prefix="doiPrefix"
							:is-selected="selected.includes(item.id)"
							:is-expanded="expanded.includes(item.id)"
							:crossref-plugin-enabled="crossrefPluginEnabled"
							:is-submission="isSubmission"
							:has-d-o-is="hasDOIs"
							@select-item="selectItem"
							@expand-item="expandItem"
							@deposit-triggered="openDepositDialog"
							@update-successful-doi-edits="updateSuccessfulDoiEdits"
						/>
					</slot>
				</template>

				<pagination
					v-if="lastPage > 1"
					slot="footer"
					:currentPage="currentPage"
					:isLoading="isLoading"
					:lastPage="lastPage"
					@set-page="setPage"
				/>
			</list-panel>
		</slot>
	</div>
</template>

<script>
import ListPanel from '@/components/ListPanel/ListPanel.vue';
import Pagination from '@/components/Pagination/Pagination.vue';
import PkpHeader from '@/components/Header/Header.vue';
import PkpFilter from '@/components/Filter/Filter.vue';
import PkpFilterAutosuggest from '@/components/Filter/FilterAutosuggest.vue';
import Search from '@/components/Search/Search.vue';
import fetch from '@/mixins/fetch';
import DoiListItem from '@/components/ListPanel/doi/DoiListItem';
import Dropdown from '@/components/Dropdown/Dropdown';
import FieldSelect from '@/components/Form/fields/FieldSelect';

export default {
	components: {
		Dropdown,
		DoiListItem,
		FieldSelect,
		ListPanel,
		Pagination,
		PkpFilter,
		PkpFilterAutosuggest,
		PkpHeader,
		Search
	},
	mixins: [fetch],
	props: {
		id: {
			type: String,
			required: true
		},
		items: {
			type: Array,
			default() {
				return [];
			}
		},
		itemsMax: {
			type: Number,
			default() {
				return 0;
			}
		},
		filters: {
			type: Array,
			default() {
				return {};
			}
		},
		title: {
			type: String,
			required: true
		},
		doiPrefix: {
			type: String,
			default() {
				return '';
			}
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
			activeFilters: {},
			isSidebarVisible: true,
			selected: [],
			expanded: []
		};
	},
	methods: {
		/**
		 * Set the list of items
		 *
		 * @see @/mixins/fetch.js
		 * @param {Array} items
		 * @param {Number} itemsMax
		 */
		setItems(items, itemsMax) {
			this.$emit('set', this.id, {
				items,
				itemsMax
			});
		},
		// Toggles
		/**
		 * Select a DoiListItem in the DoiListPanel
		 *
		 * @param {Number} itemId
		 * @param {Boolean} select Whether it should be selected or deselected
		 */
		selectItem(itemId, select) {
			const selected = this.selected.includes(itemId);
			if (select && !selected) {
				this.selected.push(itemId);
			} else if (!select && selected) {
				this.selected = this.selected.filter(item => item !== itemId);
			}
		},
		/**
		 * Expand a DoiListItem in the DoiListPanel
		 *
		 * @param {Number} itemId
		 * @param {Boolean} expand Whether it should be expanded or closed
		 */
		expandItem(itemId, expand) {
			const expanded = this.expanded.includes(itemId);
			if (expand && !expanded) {
				this.expanded.push(itemId);
			} else if (!expand && expanded) {
				this.expanded = this.expanded.filter(item => item !== itemId);
			}
		},
		/**
		 * Toggles expand all for DOI tabs
		 */
		toggleExpandAll() {
			if (this.isAllExpanded) {
				this.expanded = [];
			} else {
				this.expanded = this.items.map(i => i.id);
			}
		},
		/**
		 * Toggle select all for Ids in selected
		 */
		toggleSelectAll() {
			if (this.isAllSelected) {
				this.selected = [];
			} else {
				this.selected = this.items.map(i => i.id);
			}
		},
		/**
		 * Add an active filter
		 *
		 * @param {String} param
		 * @param {mixed} value
		 */
		addFilter(param, value) {
			let newFilters = {...this.activeFilters};
			if (['status', 'isPublished'].includes(param)) {
				// Handle "toggleable" or single select filters
				newFilters[param] = value;
			} else {
				// Handle multi-select filters
				if (!newFilters[param]) {
					newFilters[param] = [];
				}
				newFilters[param].push(value);
			}
			this.activeFilters = newFilters;
		},
		/**
		 * Is a filter currently active?
		 *
		 * @param {string} param The filter param
		 * @param {mixed} value The filter value
		 * @return {Boolean}
		 */
		isFilterActive: function(param, value) {
			if (!Object.keys(this.activeFilters).includes(param)) {
				return false;
			} else if (Array.isArray(this.activeFilters[param])) {
				return this.activeFilters[param].includes(value);
			} else {
				return this.activeFilters[param] === value;
			}
		},
		/**
		 * Remove an active filter
		 *
		 * @param {String} param
		 * @param {mixed} value
		 */
		removeFilter(param, value) {
			let newFilters = {...this.activeFilters};
			if (['status', 'isPublished', 'issueIds'].includes(param)) {
				// Handle "toggleable" filters
				delete newFilters[param];
			} else {
				// Handle multi-select filters
				newFilters[param] = newFilters[param].filter(v => v !== value);
			}
			this.activeFilters = newFilters;
		},
		openDepositDialog(itemIds = [], action = 'deposit') {
			const items = itemIds.length > 0 ? itemIds : this.selected;

			let actionMessage = '';
			let actionLabel = '';
			switch (action) {
				case 'deposit':
					actionLabel = 'Deposit DOIs';
					actionMessage = `You are about to send DOI metadata records for ${items.length} submission(s) to Crossref. Are you sure you want to deposit these records?`;
					break;
				case 'markRegistered':
					actionLabel = 'Mark DOIs registered';
					actionMessage = `You are about to mark DOI metadata records for ${items.length} submission(s) as registered. Are you sure you want to mark these records as registered?`;
					break;
				case 'export':
					actionLabel = 'Export DOIs';
					actionMessage = `You are about to export DOI metadata records for ${items.length} submission(s) for Crossref. Are you sure you want to export these records?`;
					break;
			}
			this.openDialog({
				cancelLabel: 'Cancel',
				confirmLabel: actionLabel,
				message: actionMessage,
				modalName: 'deposit',
				title: actionLabel,
				callback: () => {
					// Make ajax Request
					// This code just simulates a server request
					// 	setTimeout(() => {
					// 		this.$modal.hide('deposit');
					// 	}, 2000);
					this.executeExportAction(items, action);
				}
			});
		},
		executeExportAction(itemIds, action) {
			const exportUrl = `${this.apiUrl}/crossref?${action}=${action}&submissionIds=${itemIds}`;
			$.ajax({
				url: exportUrl,
				type: 'POST',
				headers: {
					'X-Csrf-Token': pkp.currentUser.csrfToken
				},
				indexValue: {
					action: action
				},
				success: (response, textStatus, jqXHR) =>
					this.onExportSuccess(response, textStatus, jqXHR, action),
				error: response => this.onExportError(response, action),
				complete: response => this.onExportComplete(response, action)
			});
		},
		/**
		 * Callback to fire when the form submission's ajax request has been
		 * returned successfully
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} textStatus Response status as text
		 * @param {Object} jqXHR jQuery superset of XMLHttpRequest
		 * @param {String} action The export action executed (deposit, export, markRegistered)
		 */
		onExportSuccess(response, textStatus, jqXHR, action) {
			window.console.log('[Success]:', response);

			// 'Content-Disposition: attachment;' header will not trigger download from an XmlHttpRequest.
			// We have to trigger the download from the browser directly.
			if (action === 'export') {
				const xmlString = new XMLSerializer().serializeToString(response);
				const blob = new Blob([xmlString], {type: 'text/xml'});
				const uri = URL.createObjectURL(blob);

				const header = jqXHR.getResponseHeader('content-disposition');
				const fileName = header.match(/filename="([\S]+)"/i)[1];

				let a = $('<a />');
				a.attr('download', fileName);
				a.attr('href', uri);

				const docBody = $('body');
				docBody.append(a);
				a[0].click();
				docBody.remove(a);
			}

			this.get();
			this.selected = [];
		},
		/**
		 * Callback to fire when the form submission's ajax request has been
		 * returned with errors
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} action The export action executed (deposit, export, markRegistered)
		 */
		onExportError(response, action) {
			window.console.log('[Error]', response);
		},
		/**
		 * Callback to fire when the form's submission ajax request has been
		 * returned, and the success or error callbacks have already been fired.
		 *
		 * @param {Object} response The response to the AJAX request
		 * @param {String} action The export action executed (deposit, export, markRegistered)
		 */
		onExportComplete(response, action) {
			this.$modal.hide('deposit');
		},
		/**
		 * Callback for doi-input-changed event. Updates pub-id::doi fields at the top level.
		 *
		 * @param {String} name
		 * @param {String} newValue
		 */
		onDoiInputChanged(name, newValue) {
			const nameData = this.parseDoiItemName(name);
			this.updateDoiDataFromInput(nameData, newValue);
		},

		/**
		 * Parses data needed to identify publication object to update with new DOI input
		 *
		 * @param {String} name
		 * @returns {{id: number, galleyId: number, type: string, publicationId: number}}
		 */
		parseDoiItemName(name) {
			const nameData = name.split('-');
			const type = nameData[0];
			let id = '';
			let publicationId = '';
			let galleyId = '';
			if (type === 'issue') {
				id = nameData[1];
			} else if (type === 'article' || type === 'galley') {
				id = nameData[1];
				publicationId = nameData[2];
				if (type === 'galley') {
					galleyId = nameData[3];
				}
			}

			return {
				type: type,
				id: parseInt(id),
				publicationId: parseInt(publicationId),
				galleyId: parseInt(galleyId)
			};
		},
		/**
		 * Updates DOI field within list of publication objects based on values received from doi-input-changed event
		 *
		 * @param {{id: number, galleyId: number, type: string, publicationId: number}} itemChanged
		 * @param {String} doiValue
		 * @param {Array} listToUpdate
		 *
		 * @returns {Array} List of items with individual submission/issue updated
		 */
		updateDoisInItemList(itemChanged, doiValue, listToUpdate) {
			let updatedItems = listToUpdate;

			const itemIndex = updatedItems.findIndex(
				item => item.id === itemChanged.id
			);

			if (this.isSubmission) {
				const publicationIndex = updatedItems[itemIndex].publications.findIndex(
					item => item.id === itemChanged.publicationId
				);

				if (itemChanged.type === 'article') {
					updatedItems[itemIndex].publications[publicationIndex][
						'pub-id::doi'
					] = doiValue;
				} else if (itemChanged.type === 'galley') {
					const galleyIndex = updatedItems[itemIndex].publications[
						publicationIndex
					].galleys.findIndex(item => item.id === itemChanged.galleyId);

					updatedItems[itemIndex].publications[publicationIndex].galleys[
						galleyIndex
					]['pub-id::doi'] = doiValue;
				}
			} else {
				updatedItems[itemIndex]['pub-id::doi'] = doiValue;
			}

			return updatedItems;
		},
		/**
		 *
		 * @param {Object} itemsToUpdate
		 */
		updateSuccessfulDoiEdits(itemsToUpdate) {
			let newItemsList = this.items.map(x => ({...x}));

			Object.keys(itemsToUpdate).forEach(itemId => {
				const nameData = this.parseDoiItemName(itemId);
				newItemsList = this.updateDoisInItemList(
					nameData,
					itemsToUpdate[itemId].identifier,
					newItemsList
				);
			});

			// TODO: Localize
			pkp.eventBus.$emit('notify', 'DOI(s) successfully updated', 'success');
			this.setItems(newItemsList, this.itemsMax);
		}
	},
	computed: {
		isAllSelected() {
			return this.selected.length && this.selected.length === this.items.length;
		},
		isAllExpanded() {
			return this.expanded.length && this.expanded.length === this.items.length;
		}
	},
	mounted() {
		this.$on('deposit-triggered', (id, action) => {
			this.openDepositDialog([id], action);
		});
	}
};
</script>

<style lang="less">
@import '../../../styles/_import';

.doiListPanel {
	// From PreviewListPanelSelect.vue
	.listPanel__selectAllWrapper {
		display: flex;
		align-items: center;
		//margin-top: 1rem;
		margin-left: -0.5rem;
		margin-right: auto;
		line-height: 1.5rem;

		> input {
			margin-left: 0.5rem;
		}
	}

	.listPanel__selectAllLabel {
		margin-left: 0.5rem;
	}

	.listPanel__selectWrapper {
		display: flex;
		align-items: center;
		margin-left: -1rem;
	}

	.listPanel__selector {
		line-height: 100%;
		width: 3rem;
		padding-left: 1rem;
	}
}

.doiListPanel__options {
	display: flex;
	margin-top: 0.5rem;
}

.doiListPanel__options--button {
	margin-left: 0.25rem;
}
</style>
