# Graph Report - content-os  (2026-07-08)

## Corpus Check
- 352 files · ~285,645 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1722 nodes · 3541 edges · 93 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 382 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 99|Community 99]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 148 edges
2. `Text()` - 105 edges
3. `generateUUID()` - 67 edges
4. `useAppContext()` - 61 edges
5. `useIsMobile()` - 54 edges
6. `htmlToReadableText()` - 41 edges
7. `useAuth()` - 32 edges
8. `createContentDraft()` - 27 edges
9. `BottomSheetModal()` - 26 edges
10. `normalizeContentStatus()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `getScriptLabel()` --calls--> `htmlToReadableText()`  [INFERRED]
  src/features/contents/components/burst-mode/BurstModeExperience.tsx → src/lib/utils.ts
- `testNormalizeLegacyStatuses()` --calls--> `normalizeContentStatus()`  [INFERRED]
  src/features/contents/lib/contentPipeline.test.ts → src/features/contents/lib/contentPipeline.ts
- `compareByStatus()` --calls--> `normalizeContentStatus()`  [INFERRED]
  src/features/settings/lib/seriesContentListUtils.ts → src/features/contents/lib/contentPipeline.ts
- `matchesStatusFilter()` --calls--> `normalizeContentStatus()`  [INFERRED]
  src/features/settings/lib/seriesContentListUtils.ts → src/features/contents/lib/contentPipeline.ts
- `handleSalvarCampanha()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/pages/BookDetailPage.tsx → src/utils/uuid.ts

## Communities (152 total, 19 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (50): IdeaInboxCard(), renderMetaChip(), getPersistenceApi(), persistAction(), persistContentRecord(), createContent(), createMockApi(), createState() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (33): PilarEditForm(), PostingTimeSuggestions(), pilarSlugFromNome(), createEmptyPilarPlataforma(), formatCrossedPostingPreview(), getCrossedPostingTimesForPilar(), getCrossedPostingTimesForPilarPlatform(), hasPilarPlatformSchedule() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (36): BurstModeExperience(), clamp(), getResolvedTextColor(), getScriptLabel(), handleAddFromQueue(), handleMove(), handleNameBlur(), handleRemove() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (40): applyScheduleToContent(), applyUnscheduleToContent(), buildProgramacaoCards(), buildProjetoPublicacaoByDate(), canDragCard(), earliestPlatformDate(), getPlatformColor(), isBacklogCard() (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), CacheFirst, cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (15): AnalyticsMobileScreen(), MobileEmptyState(), MobileListCard(), MobilePillButton(), MobileSectionHeader(), MobileToggleSwitch(), ProjectDetailMobileScreen(), DailyRecommendationBlock() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (28): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL(), Deferred (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (29): replacePostingTimesForPlatform(), checkForPwaUpdate(), forceMobileRefresh(), clearSaveFeedback(), emit(), getErrorMessage(), getSaveFeedbackState(), notifySaveFeedback() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (5): MobileIconButton(), cn(), PageContainer(), IconButton(), ToolbarSearchInput()

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (16): IdeaQuickCapture(), MobileAppShell(), MobileBottomNav(), getMobileRouteMeta(), MobileScrollLockProvider(), useMobileScrollLock(), useHideOnScroll(), usePullToRefresh() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (16): filterByTab(), compareByStatus(), contentPreviewText(), filterAndSortSeriesContents(), filterAndSortSeriesListItems(), formatContentListTimestamp(), matchesSearch(), matchesStatusFilter() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (4): buildCalendarEntries(), PipelineActionBar(), SeriesContentsTabs(), Text()

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (7): CacheFirst, executeQuotaErrorCallbacks(), PrecacheStrategy, Strategy, StrategyHandler, timeout(), toRequest()

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (5): getFriendlyURL(), PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (5): fetchCampanhaPublica(), SeriesStatsRow(), SettingsSectionCard(), ListItem(), Surface()

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (16): computeAllPilarMetrics(), computePilarMetrics(), computeAllSerieMetrics(), comparePublicationTimestamps(), getPublicationTimestamp(), isActiveContent(), isPostableStock(), isPublishedContent() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (12): ContentsDesktop(), buildListPageSearchParams(), parseListLimitParam(), parseListMoreParam(), parseListPageParam(), loadPipelinePreferences(), savePipelinePreferences(), buildDetailBackState() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (19): persist(), setTab(), stageIndex(), applyStatusMilestones(), canAdvanceToRecording(), canSchedulePosting(), getContentStage(), getInitialTabForContext() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (12): BookDetailPage(), getCoverageLabels(), getCreatorLabel(), getItemTypeLabel(), getProgressLabels(), getTechnicalLabels(), handleAddAnotacao(), handleBrainstormConteudo() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (8): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), Route, Router

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (10): computeSeriesContentStats(), getInboxIdeasForSeriesScripts(), getSeriesInboxIdeas(), isIncompleteRoteiro(), contentTypeLabel(), handleCreateBulkContents(), SeriesContentsFilterBar(), SeriesContentsToolbar() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (7): handleNewContent(), buildContentDetailRoute(), createContentDraft(), handleNewContent(), handleNovoRoteiro(), doPromote(), handlePromote()

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (3): usePaginatedQuery(), DataCache, handleAdd()

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (12): emptyRow(), handleAddAnotacao(), handleClose(), handleAddAnotacao(), handleTransformarEmIdeia(), createPlatform(), handleAdd(), isPadrao() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (7): normalizeProjetoTipo(), saveProjeto(), handleAddAgenda(), nextStatus(), saveEdit(), startEditing(), toggleEtapaStatus()

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (8): CacheExpiration, cacheMatchIgnoreParams(), dontWaitFor(), ExpirationPlugin, isType(), registerQuotaErrorCallback(), removeIgnoredSearchParams(), stripParams()

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (7): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), normalizeHandler(), registerRoute(), Route, Router

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (9): useBodyScrollLock(), useIsMobile(), BottomSheetModal(), ConfirmModal(), BottomSheet(), Dialog(), FixedPanelModal(), DashboardPage() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (17): handleNewIdea(), navigate(), openBlockPage(), openTeleprompter(), handlePrimaryAction(), handleCriarConteudo(), handlePromoteIdeia(), handleAddToExistingBlock() (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (3): createCacheKey(), PrecacheController, waitUntil()

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (6): addHashtag(), ensurePlatformRecord(), joinHashtags(), parseHashtags(), setHashtags(), updatePlatform()

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (7): SidePanel(), OverlayBody(), handleAddRule(), handleSave(), ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (5): appendUniqueToken(), handleOpenModal(), handleTurnIntoIdea(), normalizeToken(), resetForm()

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (4): buildSidebarSections(), isNavItemHidden(), isSettingsNavActive(), resolveNavBadge()

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (6): CacheExpiration, cacheMatchIgnoreParams(), dontWaitFor(), ExpirationPlugin, removeIgnoredSearchParams(), stripParams()

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (5): buildPlatformRecord(), handleKeyDown(), handleSave(), SeriesBulkComposer(), wordCount()

### Community 37 - "Community 37"
Cohesion: 0.35
Nodes (9): useAppContext(), buildContentMetaLine(), formatLastEdit(), getDisplayTitle(), getScriptWordCount(), getStatusChipClass(), isDraftTitle(), isRecentlyCreated() (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (10): AppProvider(), AuthProvider(), useAuth(), useNavCounts(), fetchContentStats(), NavigationBlockerProvider(), useNavigationBlocker(), ProfileSettingsPage() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (7): CacheableResponse, getFriendlyURL(), isArray(), isArrayOfClass(), isInstance(), NavigationRoute, RegExpRoute

### Community 41 - "Community 41"
Cohesion: 0.21
Nodes (9): loadMobileKinds(), readStoredJson(), writeStoredJson(), handleCancelEdit(), handleSave(), loadDayPanelOpen(), loadLayers(), resetDraft() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (11): normalizeContentStatus(), getContentStatusOptions(), getEditorialContents(), getPostedContents(), getPostingContents(), getRecordingQueueContents(), isEditorialContentStatus(), isProductionContentStatus() (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (5): getModuleFlags(), setPwaUpdateHandler(), registerPwaUpdates(), ModuleRoute(), SettingsSubSidebar()

### Community 44 - "Community 44"
Cohesion: 0.36
Nodes (11): mergeContentRecords(), mergeContents(), mergeFetchedAppData(), mergePlatforms(), content(), platform(), testMergeContentsHelper(), testMergeKeepsLocalContentsMissingFromIncoming() (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.21
Nodes (4): isInstance(), NetworkFirst, RegExpRoute, waitUntil()

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (3): CacheTimestampsModel, normalizeURL(), openDB()

### Community 48 - "Community 48"
Cohesion: 0.3
Nodes (11): addBloco(), closeTemplateEditor(), deleteBloco(), deleteTemplate(), handleCreateTemplate(), moveBloco(), openTemplateEditor(), saveBloco() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.26
Nodes (6): getGentleExperienceSettings(), readBooleanSetting(), testDefaultsToGentleExperience(), testIgnoresInvalidIndividualValues(), testIgnoresInvalidPreferenceShape(), testMergesSavedPartialPreferences()

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (9): ContentHistoryPanel(), getDisplayStatus(), testDisplayStatusFuturePublishDate(), testDisplayStatusPastPublishDateKeepsCanonical(), testDisplayStatusPostedIgnoresFutureDate(), testNormalizeLegacyStatuses(), formatDateTime(), HistorySection() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (6): getItemsForDay(), getItemsForDay(), CalendarHoverCard(), getEventDates(), format(), getStatusIcon()

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (3): buildPostedVideoContent(), handleSave(), resetForAnother()

### Community 54 - "Community 54"
Cohesion: 0.31
Nodes (8): removeToken(), addValue(), appendUniqueTag(), handleInputKeyDown(), normalizeTagToken(), removeTag(), removeValue(), toggleOption()

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (5): backToList(), handleDelete(), handleSave(), PillarEditPage(), SettingsPageScaffold()

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (3): sortPilares(), closePanel(), handleSave()

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (8): patchDomainCache(), clearPersistedDomain(), clearPersistedDomainsForUser(), isPersistedDomainFresh(), readPersistedDomain(), sanitizeDomainPayload(), storageKey(), writePersistedDomain()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (5): handleKeyDown(), handleSave(), saveAndOpen(), saveDraft(), wordCount()

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (7): ContentPreviewSheet(), ContentScriptWorkspace(), getUsefulExcerpt(), htmlToReadableText(), contentPreviewText(), scriptWordCount(), RoteiroSection()

### Community 61 - "Community 61"
Cohesion: 0.2
Nodes (3): ContentsPageSizeSelector(), scriptWordCount(), SkeletonList()

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (9): isMissingMilestoneColumn(), isMissingPublicationKindColumn(), isMissingPublishTimeColumn(), resolvePlatformIds(), saveContent(), saveContentMetric(), saveContentPlataformas(), savePilarPlataformas() (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (6): getStatusCalendarClass(), getStatusChipClass(), getStatusClassName(), getStatusColorVar(), getStatusToken(), Badge()

### Community 64 - "Community 64"
Cohesion: 0.39
Nodes (7): normalizeProfileAuthError(), clearEmailFeedback(), clearPasswordFeedback(), clearProfileFeedback(), handleSaveEmail(), handleSavePassword(), handleSaveProfile()

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (4): CacheableResponse, isArray(), isArrayOfClass(), NavigationRoute

### Community 67 - "Community 67"
Cohesion: 0.32
Nodes (8): assertQuerySuccess(), empty(), fetchAllData(), fetchBibliotecaContentCounts(), fetchBibliotecaItemById(), fetchBibliotecaPage(), fetchContentStatusCounts(), fetchDataDomains()

### Community 68 - "Community 68"
Cohesion: 0.36
Nodes (5): normalizeAction(), normalizeContentId(), getDomainsForRealtimeTable(), getListNamespacesForRealtimeTable(), isUUID()

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (7): currentUserId(), saveDnaVoz(), saveItemGeneros(), savePlatform(), savePostingTimeEntry(), savePreference(), serializePreferenceValue()

### Community 74 - "Community 74"
Cohesion: 0.52
Nodes (6): buildDomainCacheKey(), collectDomainCacheKeys(), patchContentsInDomainCaches(), patchDomainCaches(), patchPersistedDomainCachesScan(), patchPlatformsInDomainCaches()

### Community 75 - "Community 75"
Cohesion: 0.52
Nodes (5): shouldSkipRealtimeRefresh(), testAllowsRealtimeRefreshAfterSuppressionWindow(), testAllowsRealtimeRefreshWithoutLocalMutation(), testSkipsRealtimeRefreshForRecentLocalMutation(), testSkipsRealtimeRefreshWhilePersistInFlight()

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (4): fetchContentsByIds(), fetchContentsPage(), runContentScheduleSelect(), getCachedPlatforms()

### Community 78 - "Community 78"
Cohesion: 0.47
Nodes (3): handleClose(), handleCreate(), resetForm()

### Community 79 - "Community 79"
Cohesion: 0.47
Nodes (4): addToExisting(), attachToBlock(), createBlock(), OverlayFooter()

### Community 81 - "Community 81"
Cohesion: 0.7
Nodes (4): AnalyticsPage(), avaliarRegra(), contentsDoPeriodo(), periodoDias()

### Community 86 - "Community 86"
Cohesion: 0.6
Nodes (4): backToList(), handleDelete(), handleSave(), SeriesEditPage()

### Community 87 - "Community 87"
Cohesion: 0.6
Nodes (4): handleSubmit(), handleToggleMode(), normalizeAuthError(), resetStates()

### Community 88 - "Community 88"
Cohesion: 0.6
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 90 - "Community 90"
Cohesion: 0.83
Nodes (3): handleAddListItem(), handleRemoveListItem(), updateField()

## Knowledge Gaps
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 9` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 10`, `Community 11`, `Community 12`, `Community 15`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 28`, `Community 31`, `Community 32`, `Community 34`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 48`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 57`, `Community 59`, `Community 60`, `Community 61`, `Community 63`, `Community 65`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 83`, `Community 85`, `Community 87`, `Community 88`, `Community 93`, `Community 95`, `Community 96`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Why does `useAppContext()` connect `Community 37` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 10`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 28`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 41`, `Community 43`, `Community 48`, `Community 49`, `Community 52`, `Community 55`, `Community 57`, `Community 60`, `Community 68`, `Community 78`, `Community 80`, `Community 81`, `Community 82`, `Community 85`, `Community 86`, `Community 99`, `Community 100`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `Text()` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 9`, `Community 11`, `Community 15`, `Community 19`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 28`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 37`, `Community 40`, `Community 41`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 55`, `Community 57`, `Community 59`, `Community 63`, `Community 64`, `Community 65`, `Community 69`, `Community 70`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 85`, `Community 86`, `Community 87`, `Community 91`, `Community 93`, `Community 94`, `Community 95`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `generateUUID()` (e.g. with `normalizeContentId()` and `buildPostedVideoContent()`) actually correct?**
  _`generateUUID()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `useAppContext()` (e.g. with `ModuleRoute()` and `BurstModeExperience()`) actually correct?**
  _`useAppContext()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `useIsMobile()` (e.g. with `ConfirmModal()` and `BottomSheet()`) actually correct?**
  _`useIsMobile()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._