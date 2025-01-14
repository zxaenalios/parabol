import {GraphQLID, GraphQLNonNull} from 'graphql'
import {getUserId, isTeamMember} from '../../utils/authorization'
import AddMissingJiraFieldPayload from '../types/AddMissingJiraFieldPayload'
import {GQLContext} from '../graphql'
import AtlassianServerManager from '../../utils/AtlassianServerManager'
import MeetingPoker from '../../database/types/MeetingPoker'
import EstimatePhase from '../../database/types/EstimatePhase'
import getTemplateRefById from '../../postgres/queries/getTemplateRefById'
import JiraServiceTaskId from '~/shared/gqlIds/JiraServiceTaskId'
import publish from '../../utils/publish'
import {SubscriptionChannel} from '~/types/constEnums'
import {isJiraApiError, JiraScreen} from '~/utils/AtlassianManager'
import standardError from '../../utils/standardError'
import {isNotNull} from '../../utils/predicates'

const addMissingJiraField = {
  type: GraphQLNonNull(AddMissingJiraFieldPayload),
  description: `Adds a missing Jira field to a screen currently assigned to a Jira project`,
  args: {
    meetingId: {
      type: GraphQLNonNull(GraphQLID)
    },
    stageId: {
      type: GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    _source,
    {meetingId, stageId},
    {authToken, dataLoader, socketId: mutatorId}: GQLContext
  ) => {
    const viewerId = getUserId(authToken)
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}

    //AUTH
    const meeting = (await dataLoader.get('newMeetings').load(meetingId)) as MeetingPoker
    if (!meeting) {
      return {error: {message: 'Meeting not found'}}
    }
    const {endedAt, phases, meetingType, teamId, facilitatorUserId, templateRefId} = meeting
    if (!isTeamMember(authToken, teamId)) {
      return {error: {message: 'Not on the team'}}
    }
    if (endedAt) {
      return {error: {message: 'Meeting has ended'}}
    }
    if (meetingType !== 'poker') {
      return {error: {message: 'Not a poker meeting'}}
    }
    if (viewerId !== facilitatorUserId) {
      return {
        error: {message: 'Not meeting facilitator anymore'}
      }
    }

    // VALIDATION
    const estimatePhase = phases.find((phase) => phase.phaseType === 'ESTIMATE')! as EstimatePhase
    const {stages} = estimatePhase
    const stage = stages.find((stage) => stage.id === stageId)
    if (!stage) {
      return {error: {message: 'Invalid stageId provided'}}
    }

    // RESOLUTION
    const {dimensionRefIdx, service, serviceTaskId} = stage
    const templateRef = await getTemplateRefById(templateRefId)
    const {dimensions} = templateRef
    const dimensionRef = dimensions[dimensionRefIdx]
    const {name: dimensionName} = dimensionRef
    if (service !== 'jira') {
      return {error: {message: 'Non Jira service'}}
    }
    const auth = await dataLoader.get('freshAtlassianAuth').load({teamId, userId: viewerId})
    if (!auth) {
      return {error: {message: 'User no longer has access to Atlassian'}}
    }
    const {accessToken} = auth
    const {cloudId, issueKey, projectKey} = JiraServiceTaskId.split(serviceTaskId)
    const manager = new AtlassianServerManager(accessToken)
    const team = await dataLoader.get('teams').load(teamId)
    const jiraDimensionFields = team.jiraDimensionFields || []
    const dimensionField = jiraDimensionFields.find(
      (dimensionField) =>
        dimensionField.dimensionName === dimensionName &&
        dimensionField.cloudId === cloudId &&
        dimensionField.projectKey === projectKey
    )
    const {fieldType, fieldId, fieldName} = dimensionField

    const screensResponse = await manager.getScreens(cloudId)
    if (isJiraApiError(screensResponse)) {
      return {error: {message: screensResponse.errorMessage}}
    }

    const {values: screens} = screensResponse
    // we're trying to guess what's the probability that given screen is assigned to an issue project
    const evaluateProbability = (screen: JiraScreen) => {
      if (screen.name.startsWith(projectKey) && screen.name.includes('Default')) return 1
      if (screen.name.includes(projectKey)) return 0.9
      if (screen.name.includes('Bug')) return 0

      return 0.5
    }
    const possibleScreens = (
      await Promise.all(
        screens.map(async (screen) => {
          const screenTabsResponse = await manager.getScreenTabs(cloudId, screen.id)
          if (isJiraApiError(screenTabsResponse)) {
            return null
          }

          const [{id: tabId}] = screenTabsResponse
          return {screenId: screen.id, tabId, probability: evaluateProbability(screen)}
        })
      )
    )
      .filter(isNotNull)
      .sort((screen1, screen2) => screen2.probability - screen1.probability)
    if (possibleScreens.length === 0) {
      return {error: {message: 'No screens available to modify!'}}
    }

    const dummyValues = {number: 0, string: '0'}
    const dummyValue = dummyValues[fieldType]

    let updatedScreen: {screenId: string; tabId: string} | null = null
    const screensToCleanup: Array<{screenId: string; tabId: string}> = []
    // iterate over all the screens sorted by probability, try to update the given field
    for (let i = 0; i < possibleScreens.length; i++) {
      const screen = possibleScreens[i]
      const {screenId, tabId} = screen
      const addFieldResponse = await manager.addFieldToScreenTab(cloudId, screenId, tabId, fieldId)
      if (isJiraApiError(addFieldResponse)) {
        continue
      }

      try {
        // if we can update the field that was previously missing it means we've added it to the right screen
        await manager.updateStoryPoints(cloudId, issueKey, dummyValue, fieldId, fieldName)
        updatedScreen = screen
        break
      } catch (e) {
        // save a screen for a later cleanup, continue looking for a proper screen
        screensToCleanup.push({screenId, tabId})
      }
    }

    // remove field from all the unused screens
    if (screensToCleanup.length > 0) {
      await Promise.all(
        screensToCleanup.map(({screenId, tabId}) => {
          return manager.removeFieldFromScreenTab(cloudId, screenId, tabId, fieldId)
        })
      )
    }

    if (updatedScreen === null) {
      return standardError(new Error(`Couldn't fix the missing field!`))
    }

    // RESOLUTION
    const data = {dimensionField}
    publish(SubscriptionChannel.MEETING, meetingId, 'AddMissingJiraFieldSuccess', data, subOptions)
    return data
  }
}

export default addMissingJiraField
