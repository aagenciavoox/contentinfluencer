# Graph Report - content-os  (2026-07-08)

## Corpus Check
- 350 files · ~283,296 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1713 nodes · 3479 edges · 98 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 373 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
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
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
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
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 106|Community 106]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 147 edges
2. `Text()` - 104 edges
3. `generateUUID()` - 67 edges
4. `useAppContext()` - 61 edges
5. `useIsMobile()` - 49 edges
6. `htmlToReadableText()` - 41 edges
7. `useAuth()` - 31 edges
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
- `handleAddAnotacao()` --calls--> `generateUUID()`  [INFERRED]
  src/features/library/components/modals/BookNotesModal.tsx → src/utils/uuid.ts

## Communities (159 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (42): buildPostedVideoContent(), handleSave(), resetForAnother(), applyScheduleToContent(), applyUnscheduleToContent(), buildProgramacaoCards(), buildProjetoPublicacaoByDate(), canDragCard() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (38): BurstModeExperience(), clamp(), getResolvedTextColor(), getScriptLabel(), handleAddFromQueue(), handleMove(), handleNameBlur(), handleRemove() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), CacheFirst, cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (7): MobileIconButton(), PipelineStatusPills(), cn(), PageContainer(), IconButton(), ToolbarSearchInput(), ViewModeToggle()

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (15): loadMobileKinds(), AnalyticsMobileScreen(), MobileEmptyState(), MobileListCard(), MobilePillButton(), MobileSectionHeader(), scriptWordCount(), getRecordingBlockProgress() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (29): addRoute(), CacheableResponsePlugin, cacheDonePromiseForTransaction(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), createHandlerBoundToURL(), Deferred (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (16): appendScriptBlock(), handleInsertBlock(), addHashtag(), ensurePlatformRecord(), joinHashtags(), parseHashtags(), setHashtags(), updatePlatform() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (17): LibraryItemCard(), usePaginatedQuery(), isCompletedStatus(), appendUniqueToken(), handleOpenModal(), handleTurnIntoIdea(), normalizeToken(), removeToken() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): SeriesBulkComposer(), filterByTab(), compareByStatus(), contentPreviewText(), filterAndSortSeriesContents(), filterAndSortSeriesListItems(), formatContentListTimestamp(), matchesSearch() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (26): handleNewContent(), handleNewIdea(), navigate(), openBlockPage(), openTeleprompter(), buildContentDetailRoute(), createContentDraft(), handleNewContent() (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (5): getFriendlyURL(), PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (6): executeQuotaErrorCallbacks(), PrecacheStrategy, Strategy, StrategyHandler, timeout(), toRequest()

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (16): computeAllPilarMetrics(), computePilarMetrics(), computeAllSerieMetrics(), comparePublicationTimestamps(), getPublicationTimestamp(), isActiveContent(), isPostableStock(), isPublishedContent() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (3): DonutChart(), SeriesContentsTabs(), Text()

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (20): handlePrimaryAction(), persist(), setTab(), stageIndex(), applyStatusMilestones(), canAdvanceToRecording(), canSchedulePosting(), getContentStage() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (16): checkForPwaUpdate(), forceMobileRefresh(), notifySaveFeedback(), broadcastDataSync(), getChannel(), subscribeDataSync(), handleFileChange(), handleImport() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (4): fetchCampanhaPublica(), SeriesStatsRow(), ListItem(), Surface()

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (8): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), isType(), normalizeHandler(), registerQuotaErrorCallback(), Route, Router

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (9): buildListPageSearchParams(), parseListLimitParam(), parseListMoreParam(), parseListPageParam(), loadPipelinePreferences(), savePipelinePreferences(), buildDetailBackState(), openScriptDetail() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (6): CacheableResponse, createCacheKey(), isArray(), isArrayOfClass(), NavigationRoute, PrecacheController

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (10): computeSeriesContentStats(), getInboxIdeasForSeriesScripts(), getSeriesInboxIdeas(), isIncompleteRoteiro(), contentPreviewText(), contentTypeLabel(), scriptWordCount(), SeriesContentsFilterBar() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (9): BookDetailPage(), getCoverageLabels(), getCreatorLabel(), getItemTypeLabel(), getProgressLabels(), getTechnicalLabels(), handleAddAnotacao(), handleBrainstormConteudo() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (5): MobileBottomNav(), buildSidebarSections(), isNavItemHidden(), isSettingsNavActive(), resolveNavBadge()

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (3): PilarEditForm(), pilarSlugFromNome(), createEmptyPilarPlataforma()

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (3): getPostingTimes(), getPostingWindowFromTime(), PropertySelect()

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (8): CacheExpiration, cacheMatchIgnoreParams(), dontWaitFor(), ExpirationPlugin, isType(), registerQuotaErrorCallback(), removeIgnoredSearchParams(), stripParams()

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (8): IdeaInboxCard(), useIdeasInboxFilters(), filterIdeas(), ideaHasClassification(), ideaReadyForScript(), matchesQuickFilter(), sortIdeas(), Boolean()

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (9): handleAddAnotacao(), handleClose(), handleAddRule(), handleSave(), createPlatform(), handleAdd(), isPadrao(), toggleAtivo() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (5): handleAddAgenda(), handleAddEtapa(), handleSaveEtapa(), nextStatus(), toggleEtapaStatus()

### Community 31 - "Community 31"
Cohesion: 0.15
Nodes (8): CacheableResponse, CacheFirst, getFriendlyURL(), isArray(), isArrayOfClass(), isInstance(), NavigationRoute, RegExpRoute

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (6): getOrCreateDefaultRouter(), hasMethod(), isOneOf(), normalizeHandler(), Route, Router

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (3): createCacheKey(), PrecacheController, waitUntil()

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (8): isContentBodyLoaded(), upsertContent(), isConteudosListPath(), resolveContentDetailBack(), resolveRouteBack(), useContentDetailBack(), useContentDetailBackGuard(), ContentDetailPage()

### Community 35 - "Community 35"
Cohesion: 0.27
Nodes (12): PostingTimeSuggestions(), formatCrossedPostingPreview(), getCrossedPostingTimesForPilar(), getCrossedPostingTimesForPilarPlatform(), hasPilarPlatformSchedule(), isTimeWithinWindow(), isWeekdayAllowed(), shouldPersistPilarPlataforma() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (5): buildPlatformRecord(), emptyRow(), handleKeyDown(), handleSave(), wordCount()

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (6): CacheExpiration, cacheMatchIgnoreParams(), dontWaitFor(), ExpirationPlugin, removeIgnoredSearchParams(), stripParams()

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (7): useBodyScrollLock(), useIsMobile(), BottomSheetModal(), BottomSheet(), Dialog(), FixedPanelModal(), DashboardPage()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (3): renderMetaChip(), ContentDetailMobileScreen(), getEntityTagStyle()

### Community 40 - "Community 40"
Cohesion: 0.37
Nodes (8): buildContentMetaLine(), formatLastEdit(), getDisplayTitle(), getScriptWordCount(), getStatusChipClass(), isDraftTitle(), isRecentlyCreated(), resolveContentEntities()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (11): getPersistenceApi(), persistAction(), persistContentRecord(), createContent(), createMockApi(), createState(), testPersistActionDemoteContentsCreatesIdeaWhenUnlinked(), testPersistActionDemoteContentsRestoresLinkedIdea() (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.23
Nodes (11): normalizeContentStatus(), getContentStatusOptions(), getEditorialContents(), getPostedContents(), getPostingContents(), getRecordingQueueContents(), isEditorialContentStatus(), isProductionContentStatus() (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.2
Nodes (10): ConfirmModal(), backToList(), handleDelete(), handleSave(), PillarEditPage(), backToList(), handleDelete(), handleSave() (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.21
Nodes (8): resolvePlatformUuid(), dedupeViolations(), findPilarPlataforma(), getWeekInterval(), publishedThisWeek(), validatePilarFrequency(), validatePlatformSchedule(), validateWeeklyContent()

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (7): getBibliotecaTitulo(), getPilarNome(), getSerie(), handleAddIdea(), ideaHasClassification(), ideaHasClassificationTags(), saveIdea()

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (5): IdeaQuickCapture(), MobileAppShell(), getMobileRouteMeta(), useHideOnScroll(), usePullToRefresh()

### Community 49 - "Community 49"
Cohesion: 0.21
Nodes (9): buildCalendarEntries(), readStoredJson(), writeStoredJson(), handleCancelEdit(), handleSave(), loadDayPanelOpen(), loadLayers(), resetDraft() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.36
Nodes (11): mergeContentRecords(), mergeContents(), mergeFetchedAppData(), mergePlatforms(), content(), platform(), testMergeContentsHelper(), testMergeKeepsLocalContentsMissingFromIncoming() (+3 more)

### Community 51 - "Community 51"
Cohesion: 0.27
Nodes (3): CacheTimestampsModel, normalizeURL(), openDB()

### Community 52 - "Community 52"
Cohesion: 0.21
Nodes (4): isInstance(), NetworkFirst, RegExpRoute, waitUntil()

### Community 53 - "Community 53"
Cohesion: 0.27
Nodes (3): CacheTimestampsModel, normalizeURL(), openDB()

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (6): getItemsForDay(), getItemsForDay(), CalendarHoverCard(), getEventDates(), format(), getStatusIcon()

### Community 55 - "Community 55"
Cohesion: 0.38
Nodes (10): hydrateIdeaFromDemotedContent(), hydrateIdeasFromDemotedContents(), getIdeaNotes(), getIdeaTitle(), ideaSearchText(), normalizeIdea(), parseLegacyIdeaText(), resolveIdeaFields() (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.26
Nodes (9): ContentHistoryPanel(), getDisplayStatus(), testDisplayStatusFuturePublishDate(), testDisplayStatusPastPublishDateKeepsCanonical(), testDisplayStatusPostedIgnoresFutureDate(), testNormalizeLegacyStatuses(), formatDateTime(), HistorySection() (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.3
Nodes (11): addBloco(), closeTemplateEditor(), deleteBloco(), deleteTemplate(), handleCreateTemplate(), moveBloco(), openTemplateEditor(), saveBloco() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (4): useAppContext(), buildMetadataLine(), formatLastEdit(), LooksSettingsPage()

### Community 59 - "Community 59"
Cohesion: 0.27
Nodes (6): getStatusCalendarClass(), getStatusChipClass(), getStatusClassName(), getStatusColorVar(), getStatusToken(), Badge()

### Community 60 - "Community 60"
Cohesion: 0.38
Nodes (9): appReducer(), deriveTheme(), buildIdeaBodyFromContent(), buildIdeaFromContent(), buildIdeaTextFromContent(), createIdeaFromContent(), planDemoteContentsToIdeas(), restoreIdeaFromContent() (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (7): AppProvider(), AuthProvider(), useAuth(), useNavCounts(), fetchContentStats(), ProfileSettingsPage(), AppProviders()

### Community 62 - "Community 62"
Cohesion: 0.31
Nodes (8): replacePostingTimesForPlatform(), getErrorMessage(), addTime(), clearAll(), handleAdd(), handleRemove(), removeTime(), updatePreference()

### Community 63 - "Community 63"
Cohesion: 0.2
Nodes (9): assertQuerySuccess(), fetchBibliotecaContentCounts(), fetchBibliotecaItemById(), fetchBibliotecaPage(), fetchContentsByIds(), fetchContentsPage(), fetchContentStatusCounts(), runContentScheduleSelect() (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (4): getActivePilares(), sortPilares(), closePanel(), handleSave()

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (5): handleKeyDown(), handleSave(), saveAndOpen(), saveDraft(), wordCount()

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (7): normalizeProjetoTipo(), saveProjeto(), saveEdit(), startEditing(), handleClose(), handleCreate(), resetForm()

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (5): getModuleFlags(), NavigationBlockerProvider(), useNavigationBlocker(), ModuleRoute(), RequireAuth()

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (8): patchDomainCache(), clearPersistedDomain(), clearPersistedDomainsForUser(), isPersistedDomainFresh(), readPersistedDomain(), sanitizeDomainPayload(), storageKey(), writePersistedDomain()

### Community 70 - "Community 70"
Cohesion: 0.24
Nodes (10): currentUserId(), empty(), fetchAllData(), fetchDataDomains(), saveDnaVoz(), saveItemGeneros(), savePlatform(), savePostingTimeEntry() (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.25
Nodes (6): buildIdeaFields(), handleAddAnotacao(), handleTransformarEmIdeia(), handleBrainstormIdeia(), handleTransformarEmIdeia(), handleUpdate()

### Community 72 - "Community 72"
Cohesion: 0.39
Nodes (7): normalizeProfileAuthError(), clearEmailFeedback(), clearPasswordFeedback(), clearProfileFeedback(), handleSaveEmail(), handleSavePassword(), handleSaveProfile()

### Community 73 - "Community 73"
Cohesion: 0.44
Nodes (8): diffViolations(), previewScheduleViolations(), buildContent(), buildPilar(), testDiffViolationsIgnoresExisting(), testHashtagTemplateLimit(), testPreviewScheduleViolationsFrequency(), testWeeklyFrequencyExceeded()

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (9): isMissingMilestoneColumn(), isMissingPublicationKindColumn(), isMissingPublishTimeColumn(), resolvePlatformIds(), saveContent(), saveContentMetric(), saveContentPlataformas(), savePilarPlataformas() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.46
Nodes (6): getGentleExperienceSettings(), readBooleanSetting(), testDefaultsToGentleExperience(), testIgnoresInvalidIndividualValues(), testIgnoresInvalidPreferenceShape(), testMergesSavedPartialPreferences()

### Community 77 - "Community 77"
Cohesion: 0.39
Nodes (5): ContentPreviewSheet(), ContentScriptWorkspace(), getUsefulExcerpt(), htmlToReadableText(), RoteiroSection()

### Community 80 - "Community 80"
Cohesion: 0.36
Nodes (5): normalizeAction(), normalizeContentId(), getDomainsForRealtimeTable(), getListNamespacesForRealtimeTable(), isUUID()

### Community 83 - "Community 83"
Cohesion: 0.52
Nodes (6): buildDomainCacheKey(), collectDomainCacheKeys(), patchContentsInDomainCaches(), patchDomainCaches(), patchPersistedDomainCachesScan(), patchPlatformsInDomainCaches()

### Community 84 - "Community 84"
Cohesion: 0.52
Nodes (5): shouldSkipRealtimeRefresh(), testAllowsRealtimeRefreshAfterSuppressionWindow(), testAllowsRealtimeRefreshWithoutLocalMutation(), testSkipsRealtimeRefreshForRecentLocalMutation(), testSkipsRealtimeRefreshWhilePersistInFlight()

### Community 85 - "Community 85"
Cohesion: 0.38
Nodes (5): clearSaveFeedback(), emit(), getSaveFeedbackState(), subscribeSaveFeedback(), SaveFeedbackToast()

### Community 90 - "Community 90"
Cohesion: 0.7
Nodes (4): AnalyticsPage(), avaliarRegra(), contentsDoPeriodo(), periodoDias()

### Community 92 - "Community 92"
Cohesion: 0.6
Nodes (3): ensurePlatformRecord(), togglePlatform(), updatePlatform()

### Community 93 - "Community 93"
Cohesion: 0.6
Nodes (4): handleSubmit(), handleToggleMode(), normalizeAuthError(), resetStates()

### Community 100 - "Community 100"
Cohesion: 0.83
Nodes (3): handleAddListItem(), handleRemoveListItem(), updateField()

## Knowledge Gaps
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 71`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 81`, `Community 82`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 90`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 98`, `Community 99`, `Community 101`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `useAppContext()` connect `Community 58` to `Community 0`, `Community 1`, `Community 6`, `Community 8`, `Community 10`, `Community 15`, `Community 16`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 28`, `Community 29`, `Community 34`, `Community 38`, `Community 40`, `Community 43`, `Community 47`, `Community 48`, `Community 49`, `Community 54`, `Community 57`, `Community 61`, `Community 62`, `Community 67`, `Community 68`, `Community 71`, `Community 77`, `Community 80`, `Community 81`, `Community 82`, `Community 86`, `Community 90`, `Community 91`, `Community 94`, `Community 106`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Text()` connect `Community 14` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 16`, `Community 17`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 28`, `Community 29`, `Community 39`, `Community 40`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 49`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 72`, `Community 78`, `Community 79`, `Community 81`, `Community 82`, `Community 90`, `Community 91`, `Community 93`, `Community 97`, `Community 101`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `generateUUID()` (e.g. with `normalizeContentId()` and `buildPostedVideoContent()`) actually correct?**
  _`generateUUID()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `useAppContext()` (e.g. with `ModuleRoute()` and `BurstModeExperience()`) actually correct?**
  _`useAppContext()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `useIsMobile()` (e.g. with `BottomSheet()` and `Dialog()`) actually correct?**
  _`useIsMobile()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._