// Very cursed. Only done because importing css files doesn't seem to work in web extensions

export const Style = () => {
  return (
    <style>
      {`
#review-root {
  meter::-webkit-meter-optimum-value,
  meter::-moz-meter-bar {
    background: #1076db;
  }

  meter {
    border-radius: 10px;
    height: 14px;
  }

  .scoreContainer {
    display: grid;
    grid-template-columns: auto 70px 1fr;
    gap: 10px;
    align-items: center;
    margin-bottom: 20px;
    margin-top: 15px;
  }

  .singleScoreContainer {
    display: flex;
    gap: 2px;
  }

  .scoreList {
    display: flex;
    gap: 10px;
  }

  .scoreListItem {
    display: flex;
    gap: 2px;
  }

  .mainScore {
    font-weight: bold;
  }

  .smallScore {
    font-weight: bold;
  }

  .divider {
  height: 1px;
  width: 100%;
  border-bottom: 1px solid hsl(0,0%,28%)
  }

  .points-title {
    text-align: center;
    font-size: 1.3rem;
    display: block;
    position: absolute;
    width: 100%;
    height: 20px;
    bottom: 113px;
    color: #FFFFFF;
  }

  .points-value {
    position: absolute;
    text-align: center;
    width: 100%;
    bottom: 70px;
    font-size: 55px;
    font-weight: 300;
    color: #FFFFFF;
  }
}
`}
    </style>
  )
}
