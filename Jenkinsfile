#!groovy


def agentLabel = "phys"

pipeline {
    agent { label agentLabel }
    stages {
      stage("Pack") {
        steps {
          sh "zip -r rapil.zip ."
        }
      }
      stage("Archive") {
        steps {
          archiveArtifacts artifacts: 'rapil.zip', fingerprint: true
        }
      }
    }
}

