import plural from 'universal/utils/plural'
import StageTimerMinutePicker from 'universal/components/StageTimerMinutePicker'
import SecondaryButton from 'universal/components/SecondaryButton'
import React, {useState} from 'react'
import useMenu from 'universal/hooks/useMenu'
import {MenuPosition} from 'universal/hooks/useCoords'
import {createFragmentContainer, graphql} from 'react-relay'
import styled from 'react-emotion'
import DropdownMenuToggle from 'universal/components/DropdownMenuToggle'
import {StageTimerModalTimeLimit_stage} from '__generated__/StageTimerModalTimeLimit_stage.graphql'
import ms from 'ms'
import SetStageTimerMutation from 'universal/mutations/SetStageTimerMutation'
import useAtmosphere from 'universal/hooks/useAtmosphere'
import useMutationProps from 'universal/hooks/useMutationProps'
import StyledError from 'universal/components/StyledError'
import Icon from 'universal/components/Icon'

interface Props {
  closePortal: () => void
  defaultTimeLimit: number
  meetingId: string
  stage: StageTimerModalTimeLimit_stage
}

const Toggle = styled(DropdownMenuToggle)({
  padding: 8,
  minWidth: 160
})

const Row = styled('div')({
  alignItems: 'center',
  display: 'flex'
})

const SetLimit = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  padding: 16
})

const StageTimerModalTimeLimit = (props: Props) => {
  const {closePortal, defaultTimeLimit, meetingId, stage} = props
  const {suggestedTimeLimit, scheduledEndTime} = stage
  const initialTimeLimit =
    scheduledEndTime || !suggestedTimeLimit
      ? defaultTimeLimit
      : Math.min(10, Math.max(1, Math.round(suggestedTimeLimit / ms('1m'))))
  // scheduledEndTime means we're editing an existing timer
  const atmosphere = useAtmosphere()
  const [minuteTimeLimit, setMinuteTimeLimit] = useState(initialTimeLimit)
  const {menuPortal, togglePortal, menuProps: minutePickerProps, originRef} = useMenu(
    MenuPosition.LOWER_LEFT,
    {
      id: 'StageTimerMinutePicker',
      parentId: 'StageTimerModal',
      isDropdown: true
    }
  )
  const {submitting, onError, onCompleted, submitMutation, error} = useMutationProps()
  const startTimer = () => {
    if (submitting) return
    const spareTime = scheduledEndTime
      ? Math.max(0, new Date(scheduledEndTime).getTime() - Date.now())
      : 0
    const timeRemaining = minuteTimeLimit * ms('1m') + spareTime
    submitMutation()
    SetStageTimerMutation(
      atmosphere,
      {meetingId, timeRemaining, scheduledEndTime: new Date(Date.now() + timeRemaining)},
      {onError, onCompleted}
    )
    closePortal()
  }

  return (
    <SetLimit>
      <Row>
        <Icon>timer</Icon>
        <Toggle
          defaultText={`${minuteTimeLimit} ${plural(minuteTimeLimit, 'minute')}`}
          onClick={togglePortal}
          innerRef={originRef}
        />
      </Row>
      {menuPortal(
        <StageTimerMinutePicker
          minuteTimeLimit={minuteTimeLimit}
          menuProps={minutePickerProps}
          setMinuteTimeLimit={setMinuteTimeLimit}
        />
      )}
      <SecondaryButton onClick={startTimer}>
        {scheduledEndTime ? 'Add Time' : 'Start Timer'}
      </SecondaryButton>
      {error && <StyledError>{error}</StyledError>}
    </SetLimit>
  )
}

export default createFragmentContainer(
  StageTimerModalTimeLimit,
  graphql`
    fragment StageTimerModalTimeLimit_stage on NewMeetingStage {
      suggestedTimeLimit
      scheduledEndTime
    }
  `
)