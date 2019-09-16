#!groovy

//
// Custom environment variables
//
def mapEnv = [:]


pipeline {
    agent {
        label "master"
    }

    options {
        buildDiscarder(logRotator(artifactDaysToKeepStr: "20", artifactNumToKeepStr: "1", daysToKeepStr: "90", numToKeepStr: "20"))
        disableConcurrentBuilds()
    }

    stages {
        stage("Install Builder") {
            steps {
				dir("${WORKSPACE}") {
					script {
						// Load HornetJsBuilder version from package.json
						mapEnv["HORNETJSBUILDER_VERSION"] = sh(script:"node -p \"require(\'${WORKSPACE}/package.json\').hornetJsBuilder\"", returnStdout:true).trim()
						mapEnv["HORNETJSBUILDER_BASE"] = "/var/lib/jenkins/.hbw/${mapEnv["HORNETJSBUILDER_VERSION"]}"

						def propEnv = mapEnv.collect { key, value -> return key+'='+value }
						withEnv(propEnv) {
						    withNPM(npmrcConfig: "npmrc_tYo") {
						        sh '''
						            echo "Install hornet-js-builder@$HORNETJSBUILDER_VERSION"
						            echo "${HORNETJSBUILDER_VERSION}" > hb_version
						            bash hbw.sh --version
						           '''
							}
			            }
					}
				}
            }
            post {
                success {
                    echo "[SUCCESS] Success to install builder"
                }
                failure {
                    echo "[FAILURE] Failed to install builder"
                }
            }
        }

        stage("Handle Snaphot version") {
            when {
				anyOf {
	                branch "develop"
				}
            }
            steps {
                sh '''
                    bash hbw.sh dependency:set-snapshot --dependencyVersionFix=hornet-js --module=hornet-js-core
                    bash hbw.sh dependency:set-snapshot --dependencyVersionFix=hornet-themes-intranet --module=hornet-themes-intranet
                '''
            }
            post {
                success {
                    echo "[SUCCESS] Success to handle snapshot version"
                }
                failure {
                    echo "[FAILURE] Failed to handle snapshot version"
                }
            }
        }

        stage("Initialize") {
            steps {
				dir("${WORKSPACE}") {
					configFileProvider([configFile(fileId: "tYo-build-settings.properties", variable: 'BUILD_SETTINGS')]) {
						script {
							def buildSettings = readProperties file:"${BUILD_SETTINGS}"
							mapEnv << buildSettings
						}
					}
					script {
						mapEnv["MODULE_ID"] = sh(script:"node -p \"require(\'${WORKSPACE}/package.json\').name\"", returnStdout:true).trim()
						mapEnv["MODULE_GROUP"] = "fr.gouv.diplomatie.${mapEnv["MODULE_ID"]}"
						mapEnv["MODULE_GROUP_PUB"] = "fr/gouv/diplomatie/${mapEnv["MODULE_ID"]}" 
						mapEnv["MODULE_VERSION"] = sh(script:"node -p \"require(\'${WORKSPACE}/package.json\').version\"", returnStdout:true).trim()

						mapEnv["MODULE_DESCRIPTION"] = sh(script:"node -p \"require(\'${WORKSPACE}/package.json\').description\"", returnStdout:true).trim()
						mapEnv["MODULE_AUTHOR"] = sh(script:"node -p \"require(\'${WORKSPACE}/package.json\').author\"", returnStdout:true).trim()

						// Construction
						mapEnv["BUILD_TIMESTAMP"] = sh(script: 'date +%Y%m%d.%H%M%S', returnStdout:true).trim()

						if ( BRANCH_NAME.equals("develop") ) {
							mapEnv["BUILD_VERSION"] = mapEnv["MODULE_VERSION"] + "-" + mapEnv["BUILD_TIMESTAMP"] + "-" + env.BUILD_NUMBER
						} else if ( BRANCH_NAME.equals("master") ) {
							mapEnv["BUILD_VERSION"] = mapEnv["MODULE_VERSION"]
						}

						// Publication
						mapEnv["REPOSITORY_BASENAME"] = mapEnv["MODULE_ID"]

						if ( BRANCH_NAME.equals("develop") ) {
							mapEnv["PUBLISH_VERSION"] = mapEnv["MODULE_VERSION"] + "-SNAPSHOT"
							mapEnv["PUBLISH_REPOSITORY"] = mapEnv["REPOSITORY_BASENAME"] + "-snapshot"
                            mapEnv["PUBLISH_REPOSITORY_NPM"] = mapEnv["REPOSITORY_BASENAME"] + "-npm-snapshot"
						} else if ( BRANCH_NAME.equals("master") ) {
							mapEnv["PUBLISH_VERSION"] = mapEnv["MODULE_VERSION"]
							mapEnv["PUBLISH_REPOSITORY"] = mapEnv["REPOSITORY_BASENAME"] + "-release"
                            mapEnv["PUBLISH_REPOSITORY_NPM"] = mapEnv["REPOSITORY_BASENAME"] + "-npm-release"
						}

						// Déploiement
                        if ( BRANCH_NAME.equals("trunk") || BRANCH_NAME.equals("develop") ) {
							mapEnv["DEPLOY_JOB_ID"] = mapEnv["MODULE_GROUP"] + "-" + mapEnv["MODULE_ID"] + "-DEVNG-SNAPSHOT-application-" + mapEnv["MODULE_ID"] + "-scheduled-install"
						} else if ( BRANCH_NAME.equals("master") ) {
							mapEnv["DEPLOY_JOB_ID"]  = mapEnv["MODULE_GROUP"] + "-" + mapEnv["MODULE_ID"] + "-DEVNG-RELEASE-application-" + mapEnv["MODULE_ID"] + "-scheduled-install"
						}


						def propEnv = mapEnv.collect { key, value -> return key+'='+value }
						withEnv(propEnv) {
			                echo sh(script: "env|sort", returnStdout: true)

				            sh '''
				                bash hbw.sh versions:set --versionFix=${BUILD_VERSION}
				            '''
						}
					}
				}
			}
            post {
                success {
                    echo "[SUCCESS] Success to Initialize"
                }
                failure {
                    echo "[FAILURE] Failed to Initialize"
                }
            }
        }

        stage("Build artifacts") {
            steps {
				dir("${WORKSPACE}") {
					script {
						def propEnv = mapEnv.collect { key, value -> return key+'='+value }
						withEnv(propEnv) {
			                sh "bash hbw.sh publish --publish-registry ${ARTIFACTORY_URL}/api/npm/${PUBLISH_REPOSITORY_NPM} --skipTests"
                            sh "bash hbw.sh package --skipTests"
						}
					}
				}
            }
            post {
                success {
                    echo "[SUCCESS] Success to Build artifacts"
                }
                failure {
                    echo "[FAILURE] Failed to Build artifacts"
                }
            }
        }

        stage("Publish artifacts") {
            steps {
                dir("${WORKSPACE}") {
					script {
						def propEnv = mapEnv.collect { key, value -> return key+'='+value }
						withEnv(propEnv) {
                         sh '''
                        echo "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>
                        <project>
                            <modelVersion>4.0.0</modelVersion>
                            <groupId>${MODULE_GROUP}</groupId>
                            <artifactId>${MODULE_ID}</artifactId>
                            <version>${PUBLISH_VERSION}</version>
                        </project>" > ./target/${MODULE_ID}-${BUILD_VERSION}.pom
                        '''
                        withCredentials([usernamePassword(credentialsId: "${ARTIFACTORY_CREDENTIALS_KEY}", passwordVariable: "pwd_ci", usernameVariable: "user_ci")]) {
                        script {
                            def artifactory = Artifactory.newServer url: "$ARTIFACTORY_URL", username: "$user_ci", password: "$pwd_ci"
                            def uploadSpec = """{
                                "files": [
                                {
                                    "pattern": "./target/*.*",
                                    "target": "${PUBLISH_REPOSITORY}/${MODULE_GROUP_PUB}/${MODULE_ID}/${PUBLISH_VERSION}/",
                                    "recursive": false
                                }
                            ]
                            }"""
                            artifactory.upload(uploadSpec)
                        }
                    }
                }
            }
        }
    }
    post {
        success {
            echo "[SUCCESS] Success to Publish artifacts"
        }
        failure {
            echo "[FAILURE] Failed to Publish artifacts"
        }
    }
    }

        stage("Test") {
            steps {
				dir("${WORKSPACE}") {
					script {
						def propEnv = mapEnv.collect { key, value -> return key+'='+value }
						withEnv(propEnv) {
			                sh "bash hbw.sh test"
						}
					}
				}
            }
            post {
                success {
                    echo "[SUCCESS] Success to Test"
                }
                failure {
                    echo "[FAILURE] Failed to Test"
                }
            }
        }

        stage("Quality") {
            steps {
                dir("${WORKSPACE}") {
                    script {
                        def propEnv = mapEnv.collect { key, value -> return key+'='+value }
                        withEnv(propEnv) {
                            scannerHome = tool "SonarQube Scanner ${SONAR_SCANNER_CLI}"
                    
                            withCredentials([usernamePassword(credentialsId: "${SONAR_CREDENTIALS_KEY}", passwordVariable: "SONAR_CREDENTIALS_PSW", usernameVariable: "SONAR_CREDENTIALS_LOGIN")]) {
                                sh '''
                                    echo "
                                    sonar.host.url=${SONAR_URL}
                                    sonar.login=${SONAR_CREDENTIALS_PSW}
                                    sonar.projectKey=${MODULE_GROUP}:${MODULE_ID}
                                    sonar.projectName=${MODULE_ID}
                                    sonar.projectVersion=${MODULE_VERSION}
                                    sonar.sourceEncoding=UTF-8
                                    sonar.sources=src
                                    sonar.tests=test
                                    sonar.test.inclusions=**/*.spec.ts, **/*.test.karma.ts, **/*.test.karma.tslint

                                    sonar.exclusions=**/node_modules/**,**/*.spec.ts
                                    sonar.cobertura.reportPath=**/test_report/merge/cobertura-coverage.xml
								    sonar.javascript.lcov.reportPath=**/test_report/merge/lcov/lcov.info


                                    sonar.language=ts
                                    sonar.baseDir=.
                                    sonar.ts.tslint.projectPath=.
                                    sonar.ts.tslint.path=${HORNETJSBUILDER_BASE}/node_modules/tslint/bin/tslint
                                    sonar.ts.tslint.configPath=${HORNETJSBUILDER_BASE}/src/conf/tslint.json
                                    sonar.ts.tslint.ruleConfigs=${HORNETJSBUILDER_BASE}/src/conf/tslint-rules.properties
                                    sonar.typescript.lcov.reportPaths=**/test_report/merge/lcov/lcov.info
                                    sonar.ts.coverage.lcovReportPath=test_report/remap/lcov/lcov.info

                                    " > sonar-project.properties
                                '''
                        }
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                    }
                
                }
            }

            post {
                success {
                    echo "[SUCCESS] Success to run Quality"
                }
                failure {
                    echo "[FAILURE] Failed to run Quality"
                }
            }
        }
    }
}